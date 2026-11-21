import type { Client } from "@notionhq/client";
import { archiveRecord, createRecord, queryAllPages, updateRecord } from "@/lib/notion/records";
import { courseToProperties, pageToCourse } from "@/lib/notion/properties";
import type { Course } from "@/types";

export async function listCourses(notion: Client, dataSourceId: string): Promise<Course[]> {
  const pages = await queryAllPages(notion, dataSourceId);
  return pages.map((page, index) => pageToCourse(page, index)).filter((course): course is Course => course !== null);
}

export async function createCourse(notion: Client, dataSourceId: string, course: Course, index: number): Promise<Course> {
  const page = await createRecord(notion, dataSourceId, courseToProperties(course));
  return pageToCourse(page, index) ?? { ...course, id: page.id };
}

export async function updateCourse(notion: Client, course: Course): Promise<Course> {
  const page = await updateRecord(notion, course.id, courseToProperties(course));
  return pageToCourse(page, 0) ?? course;
}

export async function deleteCourse(notion: Client, pageId: string) {
  await archiveRecord(notion, pageId);
}
