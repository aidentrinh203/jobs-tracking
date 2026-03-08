import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role as WorkspaceRole, Workspace } from '@prisma/client';

@Injectable()
export class WorkspacesSeederService {
  constructor(private prisma: PrismaService) {}

  async seed(organizations: any[], users: any[]) {
    console.log('🌱 Seeding workspaces...');

    if (!organizations || organizations.length === 0) {
      throw new Error('Organizations must be seeded before workspaces');
    }

    if (!users || users.length === 0) {
      throw new Error('Users must be seeded before workspaces');
    }

    const createdWorkspaces: Workspace[] = [];

    // Create workspaces for each organization
    for (const organization of organizations) {
      const workspacesData = this.getWorkspacesDataForOrganization(organization);

      for (const workspaceData of workspacesData) {
        try {
          // Find an admin user for this organization to set as creator
          const orgMembers = await this.prisma.organizationMember.findMany({
            where: { organizationId: organization.id },
            include: { user: true },
            orderBy: { role: 'asc' }, // Admin roles come first
          });
          const creatorUser = orgMembers[0]?.user || users[0];

          const workspace = await this.prisma.workspace.create({
            data: {
              ...workspaceData,
              organizationId: organization.id,
              createdBy: creatorUser.id,
              updatedBy: creatorUser.id,
            },
          });

          // Add workspace members
          await this.addMembersToWorkspace(workspace.id, users, organization.id as string);

          createdWorkspaces.push(workspace);
          console.log(`   ✓ Created workspace: ${workspace.name} in ${organization.name}`);
        } catch (error) {
          console.error(error);
          console.log(
            `   ⚠ Workspace ${workspaceData.slug} might already exist in ${organization.name}, skipping...`,
          );
          // Try to find existing workspace
          const existingWorkspace = await this.prisma.workspace.findFirst({
            where: {
              slug: workspaceData.slug,
              organizationId: organization.id,
            },
          });
          if (existingWorkspace) {
            createdWorkspaces.push(existingWorkspace);
          }
        }
      }
    }

    console.log(
      `✅ Workspaces seeding completed. Created/Found ${createdWorkspaces.length} workspaces.`,
    );
    return createdWorkspaces;
  }

  private getWorkspacesDataForOrganization(organization: any) {
    // Default workspace for any other organization
    return [
      {
        name: 'NAZ 3D',
        slug: 'workspace',
        description: 'Construction & Architecture',
        color: '#6b7280',
        settings: {
          allowExternalGuests: false,
          defaultProjectVisibility: 'private',
          enableTimeTracking: true,
          enableGitIntegration: false,
          workflowType: 'kanban',
          sprintDuration: null,
        },
      },
    ];
  }

  private async addMembersToWorkspace(workspaceId: string, users: any[], organizationId: string) {
    // Get organization members to determine who can be added to workspace
    const orgMembers = await this.prisma.organizationMember.findMany({
      where: { organizationId },
      include: { user: true },
    });

    const memberRoles = [
      WorkspaceRole.OWNER, // First user
      WorkspaceRole.MANAGER, // Second user
      WorkspaceRole.MEMBER, // Third user
      WorkspaceRole.MEMBER, // Fourth user
      WorkspaceRole.MEMBER, // Fifth user
      WorkspaceRole.VIEWER, // Sixth user
      WorkspaceRole.MEMBER, // Seventh user (if exists)
    ];

    // Add organization members to workspace
    for (let i = 0; i < orgMembers.length && i < memberRoles.length; i++) {
      try {
        await this.prisma.workspaceMember.create({
          data: {
            userId: orgMembers[i].userId,
            workspaceId,
            role: memberRoles[i],
          },
        });
        console.log(`   ✓ Added ${orgMembers[i].user.email} to workspace as ${memberRoles[i]}`);
      } catch (error) {
        console.error(error);
        console.log(
          `   ⚠ User ${orgMembers[i].user.email} might already be a workspace member, skipping...`,
        );
      }
    }
  }

  async clear() {
    console.log('🧹 Clearing workspaces...');

    try {
      // Delete workspace members first (foreign key constraint)
      const deletedMembers = await this.prisma.workspaceMember.deleteMany();
      console.log(`   ✓ Deleted ${deletedMembers.count} workspace members`);

      // Delete workspaces
      const deletedWorkspaces = await this.prisma.workspace.deleteMany();
      console.log(`✅ Deleted ${deletedWorkspaces.count} workspaces`);
    } catch (_error) {
      console.error('❌ Error clearing workspaces:', _error);
      throw _error;
    }
  }

  findAll() {
    return this.prisma.workspace.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        color: true,
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        members: {
          select: {
            role: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            members: true,
            projects: true,
          },
        },
        createdAt: true,
      },
    });
  }
}
