import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import JobCard from "@/components/jobs/job-card";
import NewJobModal from "@/components/jobs/new-job-modal";
import PdfUploader from "@/components/upload/pdf-uploader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Check, Clock, List, FileText, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import type { JobWithCustomer, JobStats } from "@shared/schema";

export default function Dashboard() {
  const [newJobModalOpen, setNewJobModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: jobs = [], isLoading: jobsLoading } = useQuery<JobWithCustomer[]>({
    queryKey: ["/api/jobs"],
  });

  const { data: stats } = useQuery<JobStats>({
    queryKey: ["/api/stats"],
  });

  const filteredJobs = jobs.filter(job => {
    if (statusFilter === "all") return true;
    return job.status === statusFilter;
  });

  const recentActivity = [
    {
      id: 1,
      message: "Job #2024-003 completed for Manufacturing Co.",
      time: "2 hours ago",
      type: "completed"
    },
    {
      id: 2,
      message: "Started printing Job #2024-001 for Tech Solutions Inc.",
      time: "4 hours ago",
      type: "started"
    },
    {
      id: 3,
      message: "New invoice uploaded from Creative Design Studio",
      time: "6 hours ago",
      type: "upload"
    },
    {
      id: 4,
      message: "Customer notification sent for Job #2023-089",
      time: "1 day ago",
      type: "notification"
    },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "completed":
        return <div className="w-2 h-2 bg-success rounded-full mt-2" />;
      case "started":
        return <div className="w-2 h-2 bg-primary rounded-full mt-2" />;
      case "upload":
        return <div className="w-2 h-2 bg-warning rounded-full mt-2" />;
      default:
        return <div className="w-2 h-2 bg-slate-400 rounded-full mt-2" />;
    }
  };

  return (
    <>
      <Header
        title="Dashboard"
        subtitle="Manage your 3D printing jobs and track progress"
        showNewButton
        onNewClick={() => setNewJobModalOpen(true)}
        searchPlaceholder="Search jobs..."
      />

      <main className="flex-1 overflow-auto p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Active Jobs</p>
                  <p className="text-3xl font-bold text-slate-900 mt-2">
                    {stats?.activeJobs || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Play className="text-primary w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className="text-success font-medium">+2</span>
                <span className="text-slate-600 ml-1">from yesterday</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Completed Today</p>
                  <p className="text-3xl font-bold text-slate-900 mt-2">
                    {stats?.completedToday || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
                  <Check className="text-success w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className="text-success font-medium">+1</span>
                <span className="text-slate-600 ml-1">from yesterday</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Print Time</p>
                  <p className="text-3xl font-bold text-slate-900 mt-2">
                    {stats?.totalPrintTime || 0}h
                  </p>
                </div>
                <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center">
                  <Clock className="text-warning w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className="text-slate-600">Remaining this week</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Queue Length</p>
                  <p className="text-3xl font-bold text-slate-900 mt-2">
                    {stats?.queueLength || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-slate-400/10 rounded-lg flex items-center justify-center">
                  <List className="text-slate-400 w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className="text-slate-600">Jobs waiting</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Current Jobs Section */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-900">Current Print Jobs</h3>
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant={statusFilter === "all" ? "default" : "outline"}
                  onClick={() => setStatusFilter("all")}
                >
                  All
                </Button>
                <Button
                  size="sm"
                  variant={statusFilter === "printing" ? "default" : "outline"}
                  onClick={() => setStatusFilter("printing")}
                >
                  Printing
                </Button>
                <Button
                  size="sm"
                  variant={statusFilter === "paused" ? "default" : "outline"}
                  onClick={() => setStatusFilter("paused")}
                >
                  Paused
                </Button>
                <Button
                  size="sm"
                  variant={statusFilter === "completed" ? "default" : "outline"}
                  onClick={() => setStatusFilter("completed")}
                >
                  Completed
                </Button>
              </div>
            </div>

            {jobsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-slate-600 mt-2">Loading jobs...</p>
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">No jobs found</p>
                <p className="text-sm text-slate-500">
                  {statusFilter === "all" 
                    ? "Create your first job to get started" 
                    : `No jobs with status "${statusFilter}"`
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredJobs.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload Invoice */}
          <PdfUploader />

          {/* Recent Activity */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3">
                    {getActivityIcon(activity.type)}
                    <div className="flex-1">
                      <p className="text-sm text-slate-600">{activity.message}</p>
                      <p className="text-xs text-slate-500">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <NewJobModal open={newJobModalOpen} onOpenChange={setNewJobModalOpen} />
    </>
  );
}
