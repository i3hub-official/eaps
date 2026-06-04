// src/routes/admin/manage/levels/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { requireAdmin } from '$lib/server/auth/guards.js';
import { prisma } from '$lib/server/db/index.js';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
  requireAdmin(locals.user);
  
  const levels = await prisma.level.findMany({
    orderBy: [{ order: 'asc' }, { level: 'asc' }],
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
  
  // Get usage statistics for each level
  const levelStats = await Promise.all(
    levels.map(async (level) => {
      const [userCount, examCount, registrationCount] = await Promise.all([
        prisma.user.count({ where: { levelId: level.id } }),
        prisma.examLevel.count({ where: { levelId: level.id } }),
        prisma.courseRegistration.count({ where: { levelId: level.id } })
      ]);
      
      return {
        levelId: level.id,
        level: level.level,
        userCount,
        examCount,
        registrationCount
      };
    })
  );
  
  return { 
    levels,
    levelStats,
    defaultLevels: [100, 200, 300, 400, 500, 600]
  };
};

export const actions: Actions = {
  // Create a new level
  create: async ({ request, locals }) => {
    requireAdmin(locals.user);
    const data = await request.formData();
    const level = parseInt(data.get('level') as string);
    const name = data.get('name') as string;
    const order = parseInt(data.get('order') as string) || 0;
    
    // Validation
    if (isNaN(level) || level < 100 || level > 800) {
      return fail(400, { error: 'Invalid level. Must be between 100 and 800' });
    }
    
    if (level % 100 !== 0) {
      return fail(400, { error: 'Level must be a multiple of 100 (e.g., 100, 200, 300, ...)' });
    }
    
    try {
      // Check if level already exists
      const existing = await prisma.level.findUnique({
        where: { level }
      });
      
      if (existing) {
        return fail(400, { error: `Level ${level} already exists` });
      }
      
      // Create the new level
      await prisma.level.create({
        data: {
          level,
          name: name?.trim() || `${level} Level`,
          order,
          isDefault: [100, 200, 300, 400, 500, 600].includes(level)
        }
      });
    } catch (err) {
      console.error('Error creating level:', err);
      return fail(500, { error: 'Failed to create level' });
    }
    
    return { success: true, message: `Level ${level} created successfully` };
  },
  
  // Edit an existing level
  edit: async ({ request, locals }) => {
    requireAdmin(locals.user);
    const data = await request.formData();
    const id = parseInt(data.get('id') as string);
    const level = parseInt(data.get('level') as string);
    const name = data.get('name') as string;
    const order = parseInt(data.get('order') as string) || 0;
    
    // Validation
    if (isNaN(id)) {
      return fail(400, { error: 'Invalid level ID' });
    }
    
    if (isNaN(level) || level < 100 || level > 800) {
      return fail(400, { error: 'Invalid level. Must be between 100 and 800' });
    }
    
    if (level % 100 !== 0) {
      return fail(400, { error: 'Level must be a multiple of 100 (e.g., 100, 200, 300, ...)' });
    }
    
    try {
      // Get the existing level
      const existingLevel = await prisma.level.findUnique({
        where: { id }
      });
      
      if (!existingLevel) {
        return fail(404, { error: 'Level not found' });
      }
      
      // Don't allow changing the level number of default levels
      if (existingLevel.isDefault && existingLevel.level !== level) {
        return fail(400, { error: 'Cannot change the level number of default levels (100-600)' });
      }
      
      // Check if another level already has this level number
      if (existingLevel.level !== level) {
        const duplicate = await prisma.level.findUnique({
          where: { level }
        });
        
        if (duplicate) {
          return fail(400, { error: `Level ${level} already exists` });
        }
      }
      
      // Update the level
      await prisma.level.update({
        where: { id },
        data: {
          level,
          name: name?.trim() || `${level} Level`,
          order
        }
      });
    } catch (err) {
      console.error('Error updating level:', err);
      return fail(500, { error: 'Failed to update level' });
    }
    
    return { success: true, message: `Level updated successfully` };
  },
  
  // Delete a level
  delete: async ({ request, locals }) => {
    requireAdmin(locals.user);
    const data = await request.formData();
    const id = parseInt(data.get('id') as string);
    
    if (isNaN(id)) {
      return fail(400, { error: 'Invalid level ID' });
    }
    
    try {
      // Get the level with usage counts
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
      
      // Prevent deletion of default levels
      if (level.isDefault) {
        return fail(400, { error: 'Cannot delete default levels (100-600)' });
      }
      
      // Check if level is in use
      if (level._count.users > 0 || level._count.exams > 0 || level._count.registrations > 0) {
        return fail(400, { 
          error: `Cannot delete level ${level.level} because it's used by ${level._count.users} student(s), ${level._count.exams} exam(s), and ${level._count.registrations} registration(s). Update those records first.` 
        });
      }
      
      // Delete the level
      await prisma.level.delete({
        where: { id }
      });
    } catch (err) {
      console.error('Error deleting level:', err);
      return fail(500, { error: 'Failed to delete level' });
    }
    
    return { success: true, message: `Level deleted successfully` };
  },
  
  // Reorder levels
  reorder: async ({ request, locals }) => {
    requireAdmin(locals.user);
    const data = await request.formData();
    const levelIds = JSON.parse(data.get('levelIds') as string);
    
    if (!Array.isArray(levelIds)) {
      return fail(400, { error: 'Invalid order data' });
    }
    
    try {
      // Update order for each level
      for (let i = 0; i < levelIds.length; i++) {
        await prisma.level.update({
          where: { id: levelIds[i] },
          data: { order: i }
        });
      }
    } catch (err) {
      console.error('Error reordering levels:', err);
      return fail(500, { error: 'Failed to reorder levels' });
    }
    
    return { success: true, message: 'Levels reordered successfully' };
  },
  
  // Reset to default levels (100-600)
  reset: async ({ locals }) => {
    requireAdmin(locals.user);
    
    try {
      // Check if any custom levels are in use before resetting
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
          error: `Cannot reset levels. The following custom levels are in use: ${levelNumbers}. Update those records first.` 
        });
      }
      
      // Delete all non-default levels
      await prisma.level.deleteMany({
        where: { isDefault: false }
      });
      
      // Ensure default levels exist with correct order
      const defaultLevels = [100, 200, 300, 400, 500, 600];
      for (let i = 0; i < defaultLevels.length; i++) {
        await prisma.level.upsert({
          where: { level: defaultLevels[i] },
          update: {
            name: `${defaultLevels[i]} Level`,
            order: i,
            isDefault: true
          },
          create: {
            level: defaultLevels[i],
            name: `${defaultLevels[i]} Level`,
            order: i,
            isDefault: true
          }
        });
      }
    } catch (err) {
      console.error('Error resetting levels:', err);
      return fail(500, { error: 'Failed to reset levels' });
    }
    
    return { success: true, message: 'Levels reset to default successfully' };
  },
  
  // Bulk import levels
  bulkImport: async ({ request, locals }) => {
    requireAdmin(locals.user);
    const data = await request.formData();
    const levelsJson = data.get('levels') as string;
    const levelsToImport = JSON.parse(levelsJson);
    
    if (!Array.isArray(levelsToImport)) {
      return fail(400, { error: 'Invalid levels data' });
    }
    
    const results = {
      created: 0,
      skipped: 0,
      errors: [] as string[]
    };
    
    try {
      for (const item of levelsToImport) {
        const level = item.level;
        const name = item.name || `${level} Level`;
        const order = item.order || 0;
        
        // Validation
        if (isNaN(level) || level < 100 || level > 800 || level % 100 !== 0) {
          results.errors.push(`Invalid level: ${level}`);
          continue;
        }
        
        try {
          await prisma.level.upsert({
            where: { level },
            update: {
              name,
              order,
              isDefault: [100, 200, 300, 400, 500, 600].includes(level)
            },
            create: {
              level,
              name,
              order,
              isDefault: [100, 200, 300, 400, 500, 600].includes(level)
            }
          });
          results.created++;
        } catch {
          results.errors.push(`Failed to import level: ${level}`);
        }
      }
    } catch (err) {
      console.error('Error bulk importing levels:', err);
      return fail(500, { error: 'Failed to import levels' });
    }
    
    const message = `${results.created} levels imported. ${results.errors.length} errors.`;
    if (results.errors.length > 0) {
      return fail(400, { error: message, details: results.errors });
    }
    
    return { success: true, message };
  }
};