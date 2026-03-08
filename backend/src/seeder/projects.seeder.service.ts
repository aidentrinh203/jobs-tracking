import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role as ProjectRole, ProjectStatus, ProjectPriority, Project } from '@prisma/client';
import slugify from 'slugify';
import { DEFAULT_SPRINT } from '../constants/defaultWorkflow';

@Injectable()
export class ProjectsSeederService {
  constructor(private prisma: PrismaService) {}

  async seed(workspaces: any[], users: any[]) {
    console.log('🌱 Seeding projects...');

    if (!workspaces || workspaces.length === 0) {
      throw new Error('Workspaces must be seeded before projects');
    }

    if (!users || users.length === 0) {
      throw new Error('Users must be seeded before projects');
    }

    const createdProjects: Project[] = [];

    // Create projects for each workspace
    for (const workspace of workspaces) {
      const projectsData = this.getProjectsDataForWorkspace(workspace);

      // Get the organization's default workflow for this workspace
      const defaultWorkflow = await this.getDefaultWorkflowForWorkspace(workspace.id as string);

      if (!defaultWorkflow) {
        console.log(
          `   ⚠ No default workflow found for workspace ${workspace.name}, skipping projects...`,
        );
        continue;
      }

      for (const projectData of projectsData) {
        try {
          // Find a manager/admin user from workspace members to set as creator
          const workspaceMembers = await this.prisma.workspaceMember.findMany({
            where: { workspaceId: workspace.id },
            include: { user: true },
            orderBy: { role: 'asc' }, // Admin/Manager roles come first
          });
          const creatorUser = workspaceMembers[0]?.user || users[0];

          const project = await this.prisma.project.create({
            data: {
              ...projectData,
              workspaceId: workspace.id,
              workflowId: defaultWorkflow.id, // Assign the default workflow
              slug: slugify(projectData.name, { lower: true, strict: true }),
              createdBy: creatorUser.id,
              updatedBy: creatorUser.id,
              sprints: {
                create: {
                  name: DEFAULT_SPRINT.name,
                  goal: DEFAULT_SPRINT.goal,
                  status: DEFAULT_SPRINT.status,
                  isDefault: DEFAULT_SPRINT.isDefault,
                  createdBy: creatorUser.id,
                  updatedBy: creatorUser.id,
                },
              },
            },
            include: {
              workflow: {
                select: {
                  id: true,
                  name: true,
                  isDefault: true,
                },
              },
            },
          });

          // Add project members
          await this.addMembersToProject(project.id, users, workspace.id as string);

          createdProjects.push(project);
          console.log(
            `   ✓ Created project: ${project.name} in ${workspace.name} with workflow: ${defaultWorkflow.name}`,
          );
        } catch (error) {
          console.error(error);
          console.log(
            `   ⚠ Project ${projectData.name} might already exist in ${workspace.name}, skipping...`,
          );
          // Try to find existing project
          const existingProject = await this.prisma.project.findFirst({
            where: {
              workspaceId: workspace.id,
              name: projectData.name,
            },
          });
          if (existingProject) {
            createdProjects.push(existingProject);
          }
        }
      }
    }

    console.log(`✅ Projects seeding completed. Created/Found ${createdProjects.length} projects.`);
    return createdProjects;
  }

  // Helper method to get default workflow for a workspace
  private async getDefaultWorkflowForWorkspace(workspaceId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { organizationId: true },
    });

    if (!workspace) {
      return null;
    }

    return await this.prisma.workflow.findFirst({
      where: {
        organizationId: workspace.organizationId,
        isDefault: true,
      },
      select: {
        id: true,
        name: true,
        isDefault: true,
      },
    });
  }

  private getProjectsDataForWorkspace(workspace: any) {
    // Default project for any other workspace
    return [
        {
          name: 'Charles Turner',
          description:
            '2782 S.Perkins Street, New York, NY 10001\n(212) 555-1234',
          color: '#3b82f6',
          status: ProjectStatus.ACTIVE,
          priority: ProjectPriority.HIGH,
          startDate: new Date('2025-12-8'),
          endDate: new Date('2026-01-30'),
          avatar: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=150',
          settings: {
            enableTimeTracking: true,
            enableSubtasks: true,
            enableDependencies: true,
            defaultTaskType: 'TASK',
            estimationUnit: 'hours',
            allowGuestAccess: false,
            requireApprovalForCompletion: true,
          },
        },
        {
          name: 'Brett Ryan #1',
          description:
            '2071 S Pine Aire Dr, Los Angeles, CA 90025\n(310) 555-5678',
          color: '#10b981',
          status: ProjectStatus.ACTIVE,
          priority: ProjectPriority.HIGH,
          startDate: new Date('2025-12-8'),
          endDate: new Date('2026-01-30'),
          avatar: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=150',
          settings: {
            enableTimeTracking: true,
            enableSubtasks: true,
            enableDependencies: true,
            defaultTaskType: 'TASK',
            estimationUnit: 'hours',
            allowGuestAccess: false,
            requireApprovalForCompletion: true,
          },
        },
        {
          name: 'Adrew Rodgers (Pine Cone)',
          description:
            '3789 E.Pine Cone Dr.Williams, AZ 86046\n(928) 555-9012',
          color: '#f59e0b',
          status: ProjectStatus.ACTIVE,
          priority: ProjectPriority.MEDIUM,
          startDate: new Date('2025-12-8'),
          endDate: new Date('2026-01-30'),
          avatar: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=150',
          settings: {
            enableTimeTracking: true,
            enableSubtasks: true,
            enableDependencies: true,
            defaultTaskType: 'TASK',
            estimationUnit: 'hours',
            allowGuestAccess: false,
            requireApprovalForCompletion: true,
          },
        },
      ];
  }

  private async addMembersToProject(projectId: string, users: any[], workspaceId: string) {
    // Get workspace members to determine who can be added to project
    const workspaceMembers = await this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: true },
    });

    const memberRoles = [
      ProjectRole.OWNER, // First user
      ProjectRole.MANAGER, // Second user
      ProjectRole.MEMBER, // Third user
      ProjectRole.MEMBER, // Fourth user
      ProjectRole.MEMBER, // Fifth user
      ProjectRole.VIEWER, // Sixth user
      ProjectRole.MEMBER, // Seventh user (if exists)
    ];

    // Add workspace members to project (limit to avoid too many members)
    const maxMembers = Math.min(workspaceMembers.length, 6);
    for (let i = 0; i < maxMembers; i++) {
      try {
        await this.prisma.projectMember.create({
          data: {
            userId: workspaceMembers[i].userId,
            projectId,
            role: memberRoles[i],
          },
        });
        console.log(`   ✓ Added ${workspaceMembers[i].user.email} to project as ${memberRoles[i]}`);
      } catch (error) {
        console.error(error);
        console.log(
          `   ⚠ User ${workspaceMembers[i].user.email} might already be a project member, skipping...`,
        );
      }
    }
  }

  async clear() {
    console.log('🧹 Clearing projects...');

    try {
      // Delete project members first (foreign key constraint)
      const deletedMembers = await this.prisma.projectMember.deleteMany();
      console.log(`   ✓ Deleted ${deletedMembers.count} project members`);

      // Delete projects
      const deletedProjects = await this.prisma.project.deleteMany();
      console.log(`✅ Deleted ${deletedProjects.count} projects`);
    } catch (_error) {
      console.error('❌ Error clearing projects:', _error);
      throw _error;
    }
  }

  findAll() {
    return this.prisma.project.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        status: true,
        priority: true,
        startDate: true,
        endDate: true,
        workspace: {
          select: {
            id: true,
            name: true,
            slug: true,
            organization: {
              select: {
                name: true,
                slug: true,
              },
            },
          },
        },
        workflow: {
          // Add workflow information
          select: {
            id: true,
            name: true,
            isDefault: true,
            statuses: {
              select: {
                id: true,
                name: true,
                color: true,
                category: true,
                position: true,
              },
              orderBy: { position: 'asc' },
            },
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
            tasks: true,
            sprints: true,
          },
        },
        createdAt: true,
      },
    });
  }
}
