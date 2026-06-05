// src/routes/admin/manage/levels/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { requireAdmin } from '$lib/server/auth/guards.js';
import { prisma } from '$lib/server/db/index.js';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
  requireAdmin(locals.user);
  
  const levels = await prisma.level.findMany({
    orderBy: [{ level: 'asc' }], // Always sort by level number, not order
    include: {
      _count: {
        select: { 
          users: true,
          exams: true,
          registrations: true
        }
      }
    }
  });
  
  return { 
    levels,
    defaultLevels: [100, 200, 300, 400, 500, 600]
  };
};

export const actions: Actions = {
  create: async ({ request, locals }) => {
    requireAdmin(locals.user);
    const data = await request.formData();
    const level = parseInt(data.get('level') as string);
    
    if (isNaN(level) || level < 100 || level > 800) {
      return fail(400, { error: 'Invalid level. Must be between 100 and 800' });
    }
    
    if (level % 100 !== 0) {
      return fail(400, { error: 'Level must be a multiple of 100' });
    }
    
    try {
      const existing = await prisma.level.findUnique({ where: { level } });
      if (existing) {
        return fail(400, { error: `Level ${level} already exists` });
      }
      
      // Order = level number for natural sorting (100=0, 200=1, 300=2...)
      // This ensures 700 always sorts before 800 regardless of creation time
      const order = level / 100;
      
      await prisma.level.create({
        data: {
          level,
          name: `${level} Level`,
          order,
          isDefault: [100, 200, 300, 400, 500, 600].includes(level)
        }
      });
      
      return { success: true, message: `Level ${level} created successfully` };
      
    } catch (err) {
      console.error('Error creating level:', err);
      return fail(500, { error: 'Failed to create level' });
    }
  },
  
  edit: async ({ request, locals }) => {
    requireAdmin(locals.user);
    const data = await request.formData();
    const id = parseInt(data.get('id') as string);
    const newLevel = parseInt(data.get('level') as string);
    
    if (isNaN(id)) {
      return fail(400, { error: 'Invalid level ID' });
    }
    
    if (isNaN(newLevel) || newLevel < 100 || newLevel > 800) {
      return fail(400, { error: 'Invalid level. Must be between 100 and 800' });
    }
    
    if (newLevel % 100 !== 0) {
      return fail(400, { error: 'Level must be a multiple of 100' });
    }
    
    try {
      const existingLevel = await prisma.level.findUnique({ where: { id } });
      
      if (!existingLevel) {
        return fail(404, { error: 'Level not found' });
      }
      
      if (existingLevel.isDefault) {
        return fail(400, { error: 'Default levels (100-600) cannot be edited' });
      }
      
      if (existingLevel.level !== newLevel) {
        const duplicate = await prisma.level.findUnique({ where: { level: newLevel } });
        if (duplicate) {
          return fail(400, { error: `Level ${newLevel} already exists` });
        }
      }
      
      // Recalculate order based on new level number
      const order = newLevel / 100;
      
      await prisma.level.update({
        where: { id },
        data: {
          level: newLevel,
          name: `${newLevel} Level`,
          order
        }
      });
      
      return { success: true, message: `Level updated to ${newLevel}` };
      
    } catch (err) {
      console.error('Error updating level:', err);
      return fail(500, { error: 'Failed to update level' });
    }
  },
  
  delete: async ({ request, locals }) => {
    requireAdmin(locals.user);
    const data = await request.formData();
    const id = parseInt(data.get('id') as string);
    
    if (isNaN(id)) {
      return fail(400, { error: 'Invalid level ID' });
    }
    
    try {
      const level = await prisma.level.findUnique({
        where: { id },
        include: {
          _count: {
            select: { 
              users: true,
              exams: true,
              registrations: true
            }
          }
        }
      });
      
      if (!level) {
        return fail(404, { error: 'Level not found' });
      }
      
      if (level.isDefault) {
        return fail(400, { error: 'Default levels (100-600) cannot be deleted' });
      }
      
      if (level._count.users > 0 || level._count.exams > 0 || level._count.registrations > 0) {
        return fail(400, { 
          error: `Cannot delete level ${level.level} because it's used by ${level._count.users} student(s), ${level._count.exams} exam(s), and ${level._count.registrations} registration(s).`
        });
      }
      
      await prisma.level.delete({ where: { id } });
      
      return { success: true, message: `Level deleted successfully` };
      
    } catch (err) {
      console.error('Error deleting level:', err);
      return fail(500, { error: 'Failed to delete level' });
    }
  },
  
  reset: async ({ locals }) => {
    requireAdmin(locals.user);
    
    try {
      const customLevels = await prisma.level.findMany({
        where: { isDefault: false },
        include: {
          _count: {
            select: { 
              users: true,
              exams: true,
              registrations: true
            }
          }
        }
      });
      
      const levelsInUse = customLevels.filter(level => 
        level._count.users > 0 || 
        level._count.exams > 0 || 
        level._count.registrations > 0
      );
      
      if (levelsInUse.length > 0) {
        const levelNumbers = levelsInUse.map(l => l.level).join(', ');
        return fail(400, { 
          error: `Cannot reset levels. Custom levels in use: ${levelNumbers}. Update those records first.` 
        });
      }
      
      await prisma.level.deleteMany({ where: { isDefault: false } });
      
      const defaultLevels = [100, 200, 300, 400, 500, 600];
      for (let i = 0; i < defaultLevels.length; i++) {
        await prisma.level.upsert({
          where: { level: defaultLevels[i] },
          update: {
            name: `${defaultLevels[i]} Level`,
            order: i + 1, // 100=1, 200=2, etc.
            isDefault: true
          },
          create: {
            level: defaultLevels[i],
            name: `${defaultLevels[i]} Level`,
            order: i + 1,
            isDefault: true
          }
        });
      }
      
      return { success: true, message: 'Levels reset to default successfully' };
      
    } catch (err) {
      console.error('Error resetting levels:', err);
      return fail(500, { error: 'Failed to reset levels' });
    }
  }
};