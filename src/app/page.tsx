"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlayCircle, Clock, CheckCircle2, BookOpen } from "lucide-react";
import { useLibraryStore } from "@/store/library-store";
import { useRouter } from "next/navigation";
import { Course, Video } from "@/types";
import { ProgressChart } from "@/components/dashboard/progress-chart";

export default function Home() {
  const { courses } = useLibraryStore();
  const router = useRouter();

  // Get recently played videos
  const getRecentActivity = () => {
    const allVideos: { video: Video, course: Course }[] = [];

    const coursesSafe = Array.isArray(courses) ? courses : [];

    coursesSafe.forEach(course => {
      course?.sections?.forEach(section => {
        section?.videos?.forEach(video => {
          if (video?.lastPlayedAt) {
            allVideos.push({ video, course });
          }
        });
      });
    });

    return allVideos
      .sort((a, b) => (b.video.lastPlayedAt || 0) - (a.video.lastPlayedAt || 0))
      .slice(0, 2);
  };

  const recentItems = getRecentActivity();

  // Calculate stats
  const totalCompleted = courses.reduce((acc, course) => acc + course.completedVideos, 0);
  const totalCourses = courses.length;

  const handleResume = () => {
    if (recentItems.length > 0) {
      const { course, video } = recentItems[0];
      router.push(`/watch?c=${encodeURIComponent(course.id)}&v=${encodeURIComponent(video.id)}`);
    } else {
      router.push('/library');
    }
  };

  return (
    <AppLayout>
      <div className="space-y-8 animate-in fade-in duration-500">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Welcome back.</h2>
          <p className="text-muted-foreground mt-2">
            Continue your learning journey and stay focused with Study Stream.
          </p>
          <div className="mt-6">
            <Button size="lg" className="gap-2" onClick={handleResume}>
              <PlayCircle className="h-4 w-4" />
              {recentItems.length > 0 ? "Resume Session" : "Start Learning"}
            </Button>
          </div>
        </div>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Continue Watching</h3>
            <Button variant="link" className="text-muted-foreground h-auto p-0 hover:text-white" onClick={() => router.push('/library')}>
              View Library &gt;
            </Button>
          </div>

          {recentItems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {recentItems.map(({ course, video }) => (
                <Card
                  key={video.id}
                  className="group relative overflow-hidden border-border bg-[#0A0A0A] hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => router.push(`/watch?c=${encodeURIComponent(course.id)}&v=${encodeURIComponent(video.id)}`)}
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg line-clamp-1">{video.name}</CardTitle>
                    <CardDescription className="line-clamp-1">{course.name}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${video.progress}%` }}
                        />
                      </div>
                      <div className="flex items-center text-xs text-muted-foreground gap-4">
                        <span>{Math.round(video.progress)}% Complete</span>
                        {video.lastPlayedAt && (
                          <span>
                            {new Date(video.lastPlayedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="bg-[#111] rounded-xl p-8 border border-dashed border-[#333] text-center">
              <p className="text-muted-foreground text-sm">No recent activity found. Start a course from the library!</p>
            </div>
          )}
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Progress Chart takes up 1 column on mobile, but maybe should take 2 on wider screens if we had more cols. 
                        For this 3-col layout, let's make it the third card but taller or feature-rich. 
                        Actually, let's span it or rearrange.
                        
                        Option A: Keep 3 cols. Chart in col 3.
                        Option B: Make chart take full width or 2 cols.
                        
                        Based on image, it looks like a prominent side panel.
                        Let's put it in the 3rd slot for now as requested by "Study Time" replacement.
                    */}

          <Card className="flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                Active Courses
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="text-2xl font-bold mb-2">{totalCourses}</div>
              <div className="space-y-1">
                {courses.slice(0, 3).map(c => (
                  <div key={c.id} className="text-xs text-muted-foreground truncate flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-primary/50" />
                    {c.name}
                  </div>
                ))}
                {courses.length > 3 && (
                  <p className="text-[10px] text-muted-foreground pl-2.5">+ {courses.length - 3} more</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                Completed Videos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-1">{totalCompleted}</div>
              <p className="text-xs text-muted-foreground">Across {totalCourses} courses</p>
            </CardContent>
          </Card>

          <div className="md:col-span-1 h-64 md:h-auto">
            <ProgressChart />
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
