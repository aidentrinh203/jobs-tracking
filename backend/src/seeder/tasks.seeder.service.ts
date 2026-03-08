import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  Task,
  TaskType,
  TaskPriority,
  Project,
  User,
  TaskStatus,
  StatusCategory,
} from '@prisma/client';
import slugify from 'slugify';

@Injectable()
export class TasksSeederService {
  constructor(private prisma: PrismaService) {}

  async seed(projects: Project[], users: User[]) {
    console.log('🌱 Seeding tasks...');

    if (!projects || projects.length === 0) {
      throw new Error('Projects must be seeded before tasks');
    }

    if (!users || users.length === 0) {
      throw new Error('Users must be seeded before tasks');
    }

    const createdTasks: Task[] = [];

    // Create tasks for each project
    for (const project of projects) {
      console.log(`\n📋 Creating tasks for project: ${project.name}`);

      // Get all available statuses for this project
      const availableStatuses = await this.getStatusesForProject(project.id);

      if (!availableStatuses || availableStatuses.length === 0) {
        console.log(`⚠ No statuses found for project ${project.name}, skipping tasks...`);
        continue;
      }
      const defaultSprint = await this.prisma.sprint.findFirst({
        where: {
          projectId: project.id,
          isDefault: true,
        },
      });
      if (!defaultSprint) {
        console.log(`⚠ No default sprint found for project ${project.name}`);
      } else {
        console.log(`   📅 Found default sprint: ${defaultSprint.name}`);
      }

      // Get project members for assignment
      const projectMembers = await this.prisma.projectMember.findMany({
        where: { projectId: project.id },
        include: { user: true },
      });

      const availableUsers =
        projectMembers.length > 0 ? projectMembers.map((pm) => pm.user) : users.slice(0, 4); // fallback to first 4 users

      // Generate base tasks for the project type
      const baseTasksData = this.getBaseTasksForProject(project);

      // Create tasks distributed across all available statuses
      const tasksWithStatuses = this.distributeTasksAcrossStatuses(
        baseTasksData,
        availableStatuses,
      );

      let taskNumber = 1;
      for (const taskWithStatus of tasksWithStatuses) {
        try {
          const task = await this.prisma.task.create({
            data: {
              ...taskWithStatus.taskData,
              projectId: project.id,
              sprintId: defaultSprint?.id,
              taskNumber: taskNumber,
              slug: slugify(`${project.slug}-${taskNumber}`, {
                lower: true,
                strict: true,
              }),
              statusId: taskWithStatus.status.id,
              createdBy: availableUsers[0]?.id || users[0].id,
              updatedBy: availableUsers[0]?.id || users[0].id,
              // Set completedAt for DONE tasks
              completedAt:
                taskWithStatus.status.category === StatusCategory.DONE
                  ? this.getCompletedDate(
                      taskWithStatus.taskData.startDate as Date,
                      taskWithStatus.taskData.dueDate as Date,
                    )
                  : null,

              // Connect random reporters
              reporters: {
                connect: this.getRandomReporters(availableUsers, users),
              },

              // Connect random assignees
              assignees: {
                connect: this.getRandomAssignees(availableUsers, users),
              },
            },
          });

          createdTasks.push(task);
          console.log(
            `   ✓ Created task #${taskNumber}: ${task.title} [${taskWithStatus.status.name}]`,
          );
          taskNumber++;
        } catch (_error) {
          console.error(_error);
          console.log(
            `   ⚠ Error creating task ${taskWithStatus.taskData.title}: ${_error.message}`,
          );
        }
      }
    }

    console.log(
      `\n✅ Tasks seeding completed. Created ${createdTasks.length} tasks across all projects.`,
    );
    return createdTasks;
  }

  private async getStatusesForProject(projectId: string): Promise<TaskStatus[]> {
    // Get project with workspace and organization workflows
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        workspace: {
          include: {
            organization: {
              include: {
                workflows: {
                  include: {
                    statuses: {
                      orderBy: { position: 'asc' },
                    },
                  },
                  take: 1, // Get the first (default) workflow
                },
              },
            },
          },
        },
      },
    });

    return project?.workspace?.organization?.workflows?.[0]?.statuses || [];
  }

  private getBaseTasksForProject(project: Project) {
    const now = new Date();
    const oneDay = 24 * 60 * 60 * 1000;
    const oneWeek = 7 * oneDay;

    // Default tasks for other projects
    const projectStartDate = project.startDate || new Date(now.getTime() - 30 * oneDay);
    return [
      {
        title: 'Start site plan',
        description: 'Create detailed site plan showing property boundaries, topography, and site features.',
        type: TaskType.TASK,
        priority: TaskPriority.HIGH,
        storyPoints: 5,
        originalEstimate: 480,
        remainingEstimate: 0,
        startDate: projectStartDate,
        dueDate: new Date(projectStartDate.getTime() + 4 * oneDay),
      },
      {
        title: 'Start floor plan initial',
        description: 'Draft initial floor plans including room layouts, dimensions, and spatial arrangements.',
        type: TaskType.TASK,
        priority: TaskPriority.HIGH,
        storyPoints: 8,
        originalEstimate: 720,
        remainingEstimate: 120,
        startDate: new Date(projectStartDate.getTime() + 3 * oneDay),
        dueDate: new Date(projectStartDate.getTime() + oneWeek),
      },
      {
        title: 'Start elevations',
        description: 'Create building elevations showing exterior views from all sides with materials and finishes.',
        type: TaskType.TASK,
        priority: TaskPriority.MEDIUM,
        storyPoints: 8,
        originalEstimate: 640,
        remainingEstimate: 640,
        startDate: new Date(projectStartDate.getTime() + 5 * oneDay),
        dueDate: new Date(projectStartDate.getTime() + oneWeek + 3 * oneDay),
      },
      {
        title: 'Renderings',
        description: 'Produce photorealistic renderings and visualizations for client presentation.',
        type: TaskType.TASK,
        priority: TaskPriority.MEDIUM,
        storyPoints: 5,
        originalEstimate: 480,
        remainingEstimate: 480,
        startDate: new Date(now.getTime() - 3 * oneDay),
        dueDate: new Date(now.getTime() + 4 * oneDay),
      },
      {
        title: '3D model',
        description: 'Build comprehensive 3D model of the structure for design coordination and analysis.',
        type: TaskType.STORY,
        priority: TaskPriority.MEDIUM,
        storyPoints: 13,
        originalEstimate: 960,
        remainingEstimate: 960,
        startDate: new Date(now.getTime() + oneDay),
        dueDate: new Date(now.getTime() + oneWeek),
      },
      {
        title: 'Start trusses and Electrical plan',
        description: 'Design roof truss system and complete electrical layout with panel schedules.',
        type: TaskType.TASK,
        priority: TaskPriority.HIGH,
        storyPoints: 8,
        originalEstimate: 720,
        remainingEstimate: 720,
        startDate: new Date(now.getTime() + 3 * oneDay),
        dueDate: new Date(now.getTime() + oneWeek + 2 * oneDay),
      },
      {
        title: 'Engineering',
        description: 'Structural, mechanical, and electrical engineering calculations and specifications.',
        type: TaskType.TASK,
        priority: TaskPriority.HIGH,
        storyPoints: 13,
        originalEstimate: 1440,
        remainingEstimate: 1440,
        startDate: new Date(now.getTime() + 5 * oneDay),
        dueDate: new Date(now.getTime() + 2 * oneWeek),
      },
      {
        title: 'Start foundation plan + sections (steve + Minase)',
        description: 'Prepare foundation plans, sections, and details with reinforcement schedules.',
        type: TaskType.TASK,
        priority: TaskPriority.HIGH,
        storyPoints: 10,
        originalEstimate: 960,
        remainingEstimate: 960,
        startDate: new Date(now.getTime() + oneWeek),
        dueDate: new Date(now.getTime() + 2 * oneWeek + 2 * oneDay),
      },
      {
        title: 'Submit to county or city and corrections',
        description: 'Submit permit application and respond to plan check corrections from jurisdiction.',
        type: TaskType.TASK,
        priority: TaskPriority.HIGH,
        storyPoints: 8,
        originalEstimate: 640,
        remainingEstimate: 640,
        startDate: new Date(now.getTime() + 2 * oneWeek),
        dueDate: new Date(now.getTime() + 4 * oneWeek),
      },
      {
        title: 'Take offs / BIM',
        description: 'Generate quantity takeoffs and cost estimates from BIM model for bidding.',
        type: TaskType.TASK,
        priority: TaskPriority.MEDIUM,
        storyPoints: 5,
        originalEstimate: 480,
        remainingEstimate: 480,
        startDate: new Date(now.getTime() + 3 * oneWeek),
        dueDate: new Date(now.getTime() + 4 * oneWeek + 3 * oneDay),
      },
    ];
  }

  private distributeTasksAcrossStatuses(baseTasks: any[], availableStatuses: TaskStatus[]) {
    const tasksWithStatuses: Array<{ taskData: any; status: TaskStatus }> = [];

    // Sort statuses by position to maintain workflow order
    const sortedStatuses = [...availableStatuses].sort((a, b) => a.position - b.position);

    // Calculate how many tasks should be in each status category
    const todoStatuses = sortedStatuses.filter((s) => s.category === StatusCategory.TODO);
    const inProgressStatuses = sortedStatuses.filter(
      (s) => s.category === StatusCategory.IN_PROGRESS,
    );
    const doneStatuses = sortedStatuses.filter((s) => s.category === StatusCategory.DONE);

    // Distribution: ~40% TODO, ~35% IN_PROGRESS, ~25% DONE
    const totalTasks = baseTasks.length;
    const todoCount = Math.ceil(totalTasks * 0.4);
    const inProgressCount = Math.ceil(totalTasks * 0.35);
    const doneCount = totalTasks - todoCount - inProgressCount;

    let taskIndex = 0;

    // Assign DONE tasks first (oldest/completed tasks)
    for (let i = 0; i < doneCount && taskIndex < baseTasks.length; i++) {
      const status =
        doneStatuses[i % doneStatuses.length] ||
        sortedStatuses.find((s) => s.category === StatusCategory.DONE);
      if (status) {
        // Adjust remaining estimate for completed tasks
        const taskData = {
          ...baseTasks[taskIndex],
          remainingEstimate: 0,
        };
        tasksWithStatuses.push({ taskData, status });
        taskIndex++;
      }
    }

    // Assign IN_PROGRESS tasks (current work)
    for (let i = 0; i < inProgressCount && taskIndex < baseTasks.length; i++) {
      const status =
        inProgressStatuses[i % inProgressStatuses.length] ||
        sortedStatuses.find((s) => s.category === StatusCategory.IN_PROGRESS);
      if (status) {
        // Keep partial remaining estimates for in-progress tasks
        const taskData = {
          ...baseTasks[taskIndex],
          remainingEstimate: Math.floor(
            baseTasks[taskIndex].remainingEstimate * (0.3 + Math.random() * 0.6),
          ),
        };
        tasksWithStatuses.push({ taskData, status });
        taskIndex++;
      }
    }

    // Assign remaining tasks to TODO statuses
    while (taskIndex < baseTasks.length) {
      const status =
        todoStatuses[(taskIndex - doneCount - inProgressCount) % todoStatuses.length] ||
        sortedStatuses.find((s) => s.category === StatusCategory.TODO) ||
        sortedStatuses[0]; // fallback to first status

      if (status) {
        tasksWithStatuses.push({ taskData: baseTasks[taskIndex], status });
        taskIndex++;
      } else {
        break; // No status available
      }
    }

    return tasksWithStatuses;
  }

  private getRandomUsers(users: any[], count: number = 1): any[] {
    if (!users || users.length === 0) {
      return [];
    }
    
    // Shuffle users and take the first 'count' items
    const shuffled = [...users].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, users.length));
  }

  private getRandomReporters(availableUsers: any[], fallbackUsers: any[]): { id: string }[] {
    const users = availableUsers.length > 0 ? availableUsers : fallbackUsers;
    
    // Randomly decide: 1-2 reporters (80% single, 20% dual)
    const reporterCount = Math.random() < 0.8 ? 1 : 2;
    const selectedUsers = this.getRandomUsers(users, reporterCount);
    
    return selectedUsers.map(user => ({ id: user.id })).filter(r => r.id);
  }

  private getRandomAssignees(availableUsers: any[], fallbackUsers: any[]): { id: string }[] {
    const users = availableUsers.length > 0 ? availableUsers : fallbackUsers;
    
    // Randomly decide assignment:
    // 60% - single assignee
    // 30% - 2 assignees
    // 10% - 3 assignees
    const random = Math.random();
    let assigneeCount = 1;
    if (random > 0.9) {
      assigneeCount = 3;
    } else if (random > 0.6) {
      assigneeCount = 2;
    }
    
    const selectedUsers = this.getRandomUsers(users, assigneeCount);
    return selectedUsers.map(user => ({ id: user.id })).filter(a => a.id);
  }

  private getAssigneesForTask(taskData: any, availableUsers: any[]): { id: string }[] {
    // Logic to determine multiple assignees
    const assignees: { id: string }[] = [];

    // Example logic - you can customize based on your needs
    if (taskData.complexity === 'HIGH') {
      // Assign multiple users for high complexity tasks
      assignees.push({ id: availableUsers[0]?.id }, { id: availableUsers[1]?.id });
    } else {
      // Single assignee for normal tasks
      assignees.push({ id: availableUsers[0]?.id });
    }

    return assignees.filter((assignee) => assignee.id); // Remove any null/undefined ids
  }

  private getCompletedDate(startDate: Date, dueDate: Date): Date {
    // Completed tasks should be completed between start and due date, or slightly after
    const timeDiff = dueDate.getTime() - startDate.getTime();
    const completionTime = startDate.getTime() + timeDiff * (0.8 + Math.random() * 0.4); // 80-120% of planned time
    return new Date(completionTime);
  }

  async clear() {
    console.log('🧹 Clearing tasks...');

    try {
      // Delete related data first to avoid foreign key constraints
      const deletedTimeEntries = await this.prisma.timeEntry.deleteMany();
      console.log(`   ✓ Deleted ${deletedTimeEntries.count} time entries`);

      const deletedTaskWatchers = await this.prisma.taskWatcher.deleteMany();
      console.log(`   ✓ Deleted ${deletedTaskWatchers.count} task watchers`);

      const deletedTaskLabels = await this.prisma.taskLabel.deleteMany();
      console.log(`   ✓ Deleted ${deletedTaskLabels.count} task labels`);

      const deletedTaskDependencies = await this.prisma.taskDependency.deleteMany();
      console.log(`   ✓ Deleted ${deletedTaskDependencies.count} task dependencies`);

      const deletedTaskAttachments = await this.prisma.taskAttachment.deleteMany();
      console.log(`   ✓ Deleted ${deletedTaskAttachments.count} task attachments`);

      const deletedTaskComments = await this.prisma.taskComment.deleteMany();
      console.log(`   ✓ Deleted ${deletedTaskComments.count} task comments`);

      // Finally delete tasks
      const deletedTasks = await this.prisma.task.deleteMany();
      console.log(`✅ Deleted ${deletedTasks.count} tasks`);
    } catch (_error) {
      console.error('❌ Error clearing tasks:', _error);
      throw _error;
    }
  }

  findAll() {
    return this.prisma.task.findMany({
      select: {
        id: true,
        title: true,
        description: true,
        type: true,
        priority: true,
        taskNumber: true,
        slug: true,
        startDate: true,
        dueDate: true,
        completedAt: true,
        storyPoints: true,
        originalEstimate: true,
        remainingEstimate: true,
        project: {
          select: {
            id: true,
            name: true,
            slug: true,
            workspace: {
              select: {
                name: true,
                organization: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
        assignees: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        reporters: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        status: {
          select: {
            name: true,
            color: true,
            category: true,
          },
        },
        _count: {
          select: {
            comments: true,
            attachments: true,
            watchers: true,
            timeEntries: true,
          },
        },
        createdAt: true,
      },
      orderBy: [{ project: { name: 'asc' } }, { taskNumber: 'asc' }],
    });
  }
}
