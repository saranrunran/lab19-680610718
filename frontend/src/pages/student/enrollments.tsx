import { useState } from "react";
import { ArrowLeftRight, PlusCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuthStore } from "@/lib/auth-store";
import { useEnrollmentStore } from "@/lib/enrollment-store";
import { ConfirmDeleteButton } from "@/components/confirm-button";

function ChangeCourseDialog({
  studentId,
  currentCourseId,
}: {
  studentId: string;
  currentCourseId: string;
}) {
  const [open, setOpen] = useState(false);
  const [newCourseId, setNewCourseId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { courses, enrollments, updateEnrollment } = useEnrollmentStore();

  const myEnrolledCourseIds = enrollments
    .filter((e) => e.studentId === studentId)
    .map((e) => e.courseId);

  const availableCourses = courses.filter(
    (c) => !myEnrolledCourseIds.includes(c.courseId)
  );

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setNewCourseId(null);
      setErrorMsg(null);
    }
  };

  const handleUpdate = async () => {
    if (!newCourseId) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await updateEnrollment(studentId, currentCourseId, newCourseId);
      handleOpenChange(false);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update enrollment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger>
        <Button variant="ghost" size="icon">
          <ArrowLeftRight className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>เปลี่ยนวิชาเรียน {currentCourseId}</DialogTitle>
          <DialogDescription>
            เลือกวิชาใหม่แทนวิชา {currentCourseId} (เลือกได้เฉพาะวิชาที่ยังไม่ได้ลงทะเบียน)
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 py-2">
          <Label htmlFor="newCourse">วิชาใหม่</Label>
          <Select
            value={newCourseId ?? undefined}
            onValueChange={(val) => setNewCourseId(val)}
          >
            <SelectTrigger id="newCourse" className="w-full">
              <SelectValue
                placeholder={
                  availableCourses.length === 0
                    ? "ไม่มีวิชาอื่นให้เลือก"
                    : "เลือกวิชาใหม่"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {availableCourses.map((c) => (
                <SelectItem key={c.courseId} value={c.courseId}>
                  {c.courseId} — {c.courseTitle}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {errorMsg && (
            <p className="text-sm font-medium text-destructive">{errorMsg}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            disabled={!newCourseId || submitting}
            onClick={handleUpdate}
          >
            {submitting ? (
              "กำลังบันทึก..."
            ) : (
              <>
                <ArrowLeftRight className="mr-2 h-4 w-4" />
                บันทึก
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function StudentEnrollmentsPage() {
  const studentId = useAuthStore((s) => s.studentId);
  const { students, courses, enrollments, enroll, dropEnrollment } = useEnrollmentStore();

  const [open, setOpen] = useState(false);
  const [formCourse, setFormCourse] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dropError, setDropError] = useState<string | null>(null);

  const me = students.find((s) => s.studentId === studentId);
  const myEnrollments = enrollments.filter((e) => e.studentId === studentId);

  const courseOptions = courses
    .filter((c) => !myEnrollments.some((e) => e.courseId === c.courseId))
    .map((c) => ({
      value: c.courseId,
      label: `${c.courseId} — ${c.courseTitle}`,
    }));

  const courseOf = (courseId: string) =>
    courses.find((c) => c.courseId === courseId);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setFormCourse(null);
      setServerError(null);
    }
  };

  const handleEnroll = async () => {
    if (!studentId || !formCourse) return;
    setSubmitting(true);
    setServerError(null);
    try {
      await enroll(studentId, formCourse);
      handleOpenChange(false);
    } catch (err) {
      setServerError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDrop = async (studentId: string, courseId: string) => {
    setDropError(null); 
    try {
      await dropEnrollment(studentId, courseId);
    } catch (err: any) {
      setDropError((err as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">จัดการการลงทะเบียน</h1>
          <p className="text-sm text-muted-foreground">
            {me
              ? `${me.studentId} — ${me.firstName} ${me.lastName} (${me.program})`
              : (studentId ?? "-")}{" "}
            · ลงทะเบียนแล้ว {myEnrollments.length} วิชา
          </p>
        </div>

        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger render={<Button disabled={!studentId} />}>
            <PlusCircle className="h-4 w-4" />
            ลงทะเบียนเรียน
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>ลงทะเบียนเรียน</DialogTitle>
              <DialogDescription>
                เลือกวิชาที่ยังไม่ได้ลงทะเบียน
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-1.5">
              <Label htmlFor="formCourse">วิชา</Label>
              <Select
                items={courseOptions}
                value={formCourse}
                onValueChange={(v) => setFormCourse(v as string)}
              >
                <SelectTrigger id="formCourse" className="w-full">
                  <SelectValue
                    placeholder={
                      courseOptions.length === 0
                        ? "ลงทะเบียนครบทุกวิชาแล้ว"
                        : "เลือกวิชา"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {courseOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {serverError && (
              <p className="text-sm text-destructive">{serverError}</p>
            )}
            <DialogFooter>
              <Button
                disabled={!formCourse || submitting}
                onClick={handleEnroll}
              >
                <PlusCircle className="h-4 w-4" />
                {submitting ? "กำลังลงทะเบียน..." : "ลงทะเบียน"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {dropError && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm font-medium text-destructive">
          {dropError}
        </div>
      )}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>รหัสวิชา</TableHead>
              <TableHead>ชื่อวิชา</TableHead>
              <TableHead>ผู้สอน</TableHead>
              <TableHead>วันที่ลงทะเบียน</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {myEnrollments.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-20 text-center text-muted-foreground"
                >
                  ยังไม่ได้ลงทะเบียนวิชาใด
                </TableCell>
              </TableRow>
            )}
            {myEnrollments.map((e) => {
              const course = courseOf(e.courseId);
              return (
                <TableRow key={e.courseId}>
                  <TableCell>{e.courseId}</TableCell>
                  <TableCell>{course?.courseTitle ?? "-"}</TableCell>
                  <TableCell>{course?.instructors.join(", ") || "-"}</TableCell>
                  <TableCell>
                    {e.enrolledAt
                      ? new Date(e.enrolledAt).toLocaleString("th-TH")
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-row">
                      <ChangeCourseDialog
                        studentId={e.studentId}
                        currentCourseId={e.courseId}
                      />
                      <ConfirmDeleteButton
                        label="Drop"
                        title={`ยกเลิกการลงทะเบียนวิชา ${e.courseId}`}
                        description={`${course?.courseTitle}?`}
                        onConfirm={() => {
                          void handleDrop(e.studentId, e.courseId);
                        }}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
