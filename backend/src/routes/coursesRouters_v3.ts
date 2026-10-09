import { Router, type Request, type Response } from "express";
import {
  zCourseId,
  zCoursePostBody,
  zCoursePutBody,
} from "../libs/zodValidators.ts";

import type { Student, Course, User, CustomRequest } from "../libs/types.ts";

// import database
// import { courses, users } from "../db/db.ts";
import { PrismaClient } from "../../generated/prisma/client.ts";
const prisma = new PrismaClient();

import { authenticateToken } from "../middlewares/authenMiddleware.ts";
import { checkRoles } from "../middlewares/checkRolesDBMiddleware.ts";
import { checkRoleAdmin } from "../middlewares/checkRoleAdminDBMiddleware.ts";

const router = Router();

// GET /api/v3/courses
router.get(
  "/",
  authenticateToken,
  checkRoles,
  async (req: Request, res: Response) => {
    try {
      // get courses from database
      const courses = await prisma.course.findMany()

      return res.json({
        success: true,
        data: courses,
      });
    } catch (err) {
      return res.status(200).json({
        success: false,
        message: "Something is wrong, please try again",
        error: err,
      });
    }
  }
);

// GET /api/v3/courses/{courseId}
router.get(
  "/:courseId", 
  authenticateToken, 
  async (req: Request, res: Response) => {
  try {
    const courseId = req.params.courseId;
    const parseResult = zCourseId.safeParse(courseId);

    if (!parseResult.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parseResult.error.issues[0]?.message,
      });
    }

    const course = await prisma.course.findUnique({
      where: { courseId: courseId as string}
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: `Course ${courseId} does not exists`,
      });
    }

    res.status(200).json({
      success: true,
      data: course,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Something is wrong, please try again",
      error: err,
    });
  }
});

// POST /api/v3/courses, body = {new course data}
// add a new course
router.post(
  "/", 
  authenticateToken, 
  checkRoleAdmin,
  async (req: CustomRequest, res: Response) => {
    try {
      // read body and validate
      const body = (await req.body) as Course;
      const result = zCoursePostBody.safeParse(body);
      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: result.error.issues[0]?.message,
        });
      }

      // check if courseId already exists
      const course = await prisma.course.findFirst({
        where: { 
          OR: [
            {courseId: body.courseId},
            {courseTitle: body.courseTitle}
          ]
        },
      });

      // if courseId or courseTitle is already taken
      if (course) {
        return res.status(400).json({
          success: false,
          message: "Course Title or Course ID is already taken.",
        });
      }
      // if not, add a new course to database
      const new_course: Course = {
        courseId: body.courseId,
        courseTitle: body.courseTitle,
        instructors: body.instructors
      };
      const created = await prisma.course.create({
        data: new_course
      });

      res.set("Link", `/${created.id}`);

      // return success message
      return res.status(201).json({
        success: true,
        data: created
      });
      
    } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Something is wrong, please try again",
      error: err,
    });
  }
  
});

// PUT /api/v3/courses, body = {courseId, courseTitle?, instructors?}
// Update specified course (ADMIN only)
router.put(
  "/",
  authenticateToken,
  checkRoleAdmin,
  async (req: CustomRequest, res: Response) => {
    try {
      // validate req.body
      const result = zCoursePutBody.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: result.error.issues[0]?.message,
        });
      }
      const { courseId, courseTitle, instructors } = result.data;

      // check if the course exists
      const course = await prisma.course.findUnique({
        where: { courseId } 
      });
      if (!course) {
        return res.status(404).json({
          success: false,
          message: `Course ${courseId} does not exists`,
        });
      }

      // new courseTitle must not be taken by another course
      if (courseTitle != null) {
        const sameTitle = await prisma.course.findFirst({
          where: { courseTitle, NOT: { courseId } },
        });
        if (sameTitle) {
          return res.status(400).json({
            success: false,
            message: "Course Title is already taken.",
          });
        }
      }

      // update only fields that were sent (skip null/undefined)
      const updated = await prisma.course.update({
        where: { courseId },
        data: {
          ...(courseTitle != null && { courseTitle }),
          ...(instructors != null && { instructors }),
        },
      });

      return res.status(200).json({
        success: true,
        message: `Course ${courseId} has been updated successfully`,
        data: updated,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Something is wrong, please try again",
        error: err,
      });
    }
  }
);

// DELETE /api/v3/courses, body = {courseId}
// delete a course (ADMIN only)
router.delete(
  "/",
  authenticateToken,
  checkRoleAdmin,
  async (req: CustomRequest, res: Response) => {
    try {
      // validate courseId
      const result = zCourseId.safeParse(req.body?.courseId);
      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: result.error.issues[0]?.message,
        });
      }
      const courseId = result.data;

      // check if the course exists
      const course = await prisma.course.findUnique({ where: { courseId } });
      if (!course) {
        return res.status(404).json({
          success: false,
          message: `Course ${courseId} does not exists`,
        });
      }

      // remove related enrollments first (they reference courseId),
      // then remove the course itself
      const [, deleted] = await prisma.$transaction([
        prisma.enrollment.deleteMany({ where: { courseId } }),
        prisma.course.delete({ where: { courseId } }),
      ]);

      return res.status(200).json({
        success: true,
        message: `Course ${courseId} has been deleted successfully`,
        data: deleted,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Something is wrong, please try again",
        error: err,
      });
    }
  }
);

export default router;
