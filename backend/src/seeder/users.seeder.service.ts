import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role, UserStatus, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersSeederService {
  constructor(private prisma: PrismaService) {}

  async seed() {
    console.log('🌱 Seeding users...');

    const hashedPassword = await bcrypt.hash('Naz3d@@2026', 10);

    const usersData = [
      {
        email: 'admin@naz3d.com',
        username: 'admin',
        firstName: 'Admin',
        lastName: 'User',
        role: Role.SUPER_ADMIN,
        status: UserStatus.ACTIVE,
        password: hashedPassword,
        emailVerified: true,
        bio: 'System administrator with full access to all features',
        timezone: 'UTC',
        language: 'en',
        mobileNumber: '+10000000001',
      },
      {
        email: 'aiden@naz3d.com',
        username: 'aiden',
        firstName: 'Aiden',
        lastName: 'Trinh',
        role: Role.MANAGER,
        status: UserStatus.ACTIVE,
        password: hashedPassword,
        emailVerified: true,
        bio: 'Senior Software Engineer specializing in Backend Development and System Architecture',
        timezone: 'America/New_York',
        language: 'en',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
        mobileNumber: '+10000000002',
      },
      {
        email: 'kevin@naz3d.com',
        username: 'kevin',
        firstName: 'Kevin',
        lastName: 'Vo',
        role: Role.MANAGER,
        status: UserStatus.ACTIVE,
        password: hashedPassword,
        emailVerified: true,
        bio: 'Naz 3D',
        timezone: 'America/New_York',
        language: 'en',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
        mobileNumber: '+10000000003',
      },
      {
        email: 'steve@naz3d.com',
        username: 'steve',
        firstName: 'Steve',
        lastName: '-',
        role: Role.MEMBER,
        status: UserStatus.ACTIVE,
        password: hashedPassword,
        emailVerified: true,
        bio: 'Naz 3D',
        timezone: 'America/New_York',
        language: 'en',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
        mobileNumber: '+10000000004',
      },
      {
        email: 'nathaniel@naz3d.com',
        username: 'nathaniel',
        firstName: 'Nathaniel',
        lastName: '-',
        role: Role.MEMBER,
        status: UserStatus.ACTIVE,
        password: hashedPassword,
        emailVerified: true,
        bio: 'Site Plan Starter',
        timezone: 'America/New_York',
        language: 'en',
        mobileNumber: '+10000000006',
      },
      {
        email: 'minase@naz3d.com',
        username: 'minase',
        firstName: 'Minase',
        lastName: '-',
        role: Role.MEMBER,
        status: UserStatus.ACTIVE,
        password: hashedPassword,
        emailVerified: true,
        bio: 'Floor plan initial',
        timezone: 'America/New_York',
        language: 'en',
        mobileNumber: '+10000000006',
      },
      {
        email: 'nahom@naz3d.com',
        username: 'nahom',
        firstName: 'Nahom',
        lastName: '-',
        role: Role.MEMBER,
        status: UserStatus.ACTIVE,
        password: hashedPassword,
        emailVerified: true,
        bio: 'Renderings',
        timezone: 'America/New_York',
        language: 'en',
        mobileNumber: '+10000000006',
      },
      {
        email: 'james@naz3d.com',
        username: 'nahom',
        firstName: 'Nahom',
        lastName: '-',
        role: Role.MEMBER,
        status: UserStatus.ACTIVE,
        password: hashedPassword,
        emailVerified: true,
        bio: 'Renderings',
        timezone: 'America/New_York',
        language: 'en',
        mobileNumber: '+10000000006',
      },
      {
        email: 'emma.davis@naz3d.com',
        username: 'emmadavis',
        firstName: 'Emma',
        lastName: 'Davis',
        role: Role.VIEWER,
        status: UserStatus.ACTIVE,
        password: hashedPassword,
        emailVerified: true,
        bio: 'Client',
        timezone: 'America/New_York',
        language: 'en',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
        mobileNumber: '+10000000007',
      },
    ];

    const createdUsers: User[] = [];
    for (const userData of usersData) {
      try {
        const user = await this.prisma.user.create({
          data: {
            ...userData,
            preferences: {
              theme: 'light',
              notifications: {
                email: true,
                push: true,
                desktop: true,
              },
              dashboard: {
                showCompletedTasks: false,
                defaultView: 'list',
              },
            },
          },
        });
        createdUsers.push(user);
        console.log(`   ✓ Created user: ${user.email}`);
      } catch (error) {
        console.error(error);
        console.log(`   ⚠ User ${userData.email} might already exist, skipping...`);
        // Try to find existing user
        const existingUser = await this.prisma.user.findUnique({
          where: { email: userData.email },
        });
        if (existingUser) {
          createdUsers.push(existingUser);
        }
      }
    }

    console.log(`✅ Users seeding completed. Created/Found ${createdUsers.length} users.`);
    return createdUsers;
  }

  async clear() {
    console.log('🧹 Clearing users...');

    try {
      const deletedCount = await this.prisma.user.deleteMany();
      console.log(`✅ Deleted ${deletedCount.count} users`);
    } catch (_error) {
      console.error('❌ Error clearing users:', _error);
      throw _error;
    }
  }

  findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        bio: true,
        mobileNumber: true,
        timezone: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });
  }
}
