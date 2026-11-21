"use client";

import { FormField } from "@/components/shared/ui-bits";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useCampus } from "@/hooks/use-campus";
import { fieldErrors, courseSchema } from "@/lib/validation";
import type { Course } from "@/types";
import { useState } from "react";
import { toast } from "sonner";

export function CourseFormDialog({
  open,
  onOpenChange,
  course,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: Course | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? <CourseForm key={course?.id ?? "new"} course={course} onOpenChange={onOpenChange} /> : null}
    </Dialog>
  );
}

function CourseForm({ course, onOpenChange }: { course: Course | null; onOpenChange: (open: boolean) => void }) {
  const { data, addCourse, updateCourse } = useCampus();
  const [form, setForm] = useState({
    name: course?.name ?? "",
    code: course?.code ?? "",
    instructor: course?.instructor ?? "",
    creditHours: String(course?.creditHours ?? 3),
    semester: course?.semester ?? data?.profile.semester ?? "Fall 2026",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = courseSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    try {
      if (course) await updateCourse(course.id, parsed.data);
      else await addCourse(parsed.data);
      toast.success(course ? "Course updated" : "Course added");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the course");
    }
  }

  return (
    <DialogContent title={course ? "Edit course" : "Add course"}>
        <form className="grid gap-3" onSubmit={submit}>
          <FormField label="Course name" htmlFor="course-name" error={errors.name}>
            <Input id="course-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Code" htmlFor="course-code" error={errors.code}>
              <Input id="course-code" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} />
            </FormField>
            <FormField label="Credit hours" htmlFor="course-credits" error={errors.creditHours}>
              <Input id="course-credits" type="number" min={0.5} max={12} step={0.5} value={form.creditHours} onChange={(event) => setForm({ ...form, creditHours: event.target.value })} />
            </FormField>
          </div>
          <FormField label="Instructor" htmlFor="course-instructor" error={errors.instructor}>
            <Input id="course-instructor" value={form.instructor} onChange={(event) => setForm({ ...form, instructor: event.target.value })} />
          </FormField>
          <FormField label="Semester" htmlFor="course-semester" error={errors.semester}>
            <Input id="course-semester" value={form.semester} onChange={(event) => setForm({ ...form, semester: event.target.value })} />
          </FormField>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{course ? "Save changes" : "Add course"}</Button>
          </div>
        </form>
      </DialogContent>
  );
}
