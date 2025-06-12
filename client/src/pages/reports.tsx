import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, Clock, Users, Calendar, FileText } from "lucide-react";
import { formatTime } from "@/lib/utils";
import type { JobWithCustomer, JobStats } from "@shared/schema";

export default function Reports() {
  const { data: jobs = [] } = useQuery<JobWithCustomer[]>({
    queryKey: ["/api/jobs"],
  });

  const { data: stats } = useQuery<JobStats>({
    queryKey: ["/api/stats"],
  });

  // Calculate additional metrics
  const completedJobs = jobs.filter(job => job.status === 'completed');
  const averageCompletionTime = completedJobs.length > 0 
    ? Math.round(completedJobs.reduce((sum, job) => sum + (job.actualTime || job.totalEstimatedTime || 0), 0) / completedJobs.length)
    : 0;

  const topCustomers = jobs.reduce((acc, job) => {
    const customer = job.customer.name;
    acc[customer] = (acc[customer] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sortedCustomers = Object.entries(topCustomers)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);

  const recentCompletions = completedJobs
    .filter(job => job.completedAt)
    .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())
    .slice(0, 10);

  return (
    <>
      <Header
        title="Reports"
        subtitle="Analytics and insights for your 3D printing business"
      />

      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Total Jobs</p>
                    <p className="text-3xl font-bold text-slate-900 mt-2">{jobs.length}</p>
                  </div>
                  <FileText className="w-8 h-8 text-slate-400" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Completed Jobs</p>
                    <p className="text-3xl font-bold text-slate-900 mt-2">{completedJobs.length}</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-success" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Avg. Completion Time</p>
                    <p className="text-3xl font-bold text-slate-900 mt-2">
                      {formatTime(averageCompletionTime)}
                    </p>
                  </div>
                  <Clock className="w-8 h-8 text-warning" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Active Customers</p>
                    <p className="text-3xl font-bold text-slate-900 mt-2">
                      {Object.keys(topCustomers).length}
                    </p>
                  </div>
                  <Users className="w-8 h-8 text-primary" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Job Status Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5" />
                  <span>Job Status Breakdown</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { status: 'completed', label: 'Completed', count: jobs.filter(j => j.status === 'completed').length },
                    { status: 'printing', label: 'Printing', count: jobs.filter(j => j.status === 'printing').length },
                    { status: 'not_started', label: 'Not Started', count: jobs.filter(j => j.status === 'not_started').length },
                    { status: 'paused', label: 'Paused', count: jobs.filter(j => j.status === 'paused').length },
                  ].map(({ status, label, count }) => (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Badge variant="outline" className={`
                          ${status === 'completed' ? 'bg-success/10 text-success border-success/20' : ''}
                          ${status === 'printing' ? 'bg-primary/10 text-primary border-primary/20' : ''}
                          ${status === 'not_started' ? 'bg-slate-100 text-slate-600 border-slate-200' : ''}
                          ${status === 'paused' ? 'bg-warning/10 text-warning border-warning/20' : ''}
                        `}>
                          {label}
                        </Badge>
                        <span className="text-sm text-slate-600">{count} jobs</span>
                      </div>
                      <div className="text-sm font-medium">
                        {jobs.length > 0 ? Math.round((count / jobs.length) * 100) : 0}%
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Customers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="w-5 h-5" />
                  <span>Top Customers</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sortedCustomers.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-4">No customer data available</p>
                  ) : (
                    sortedCustomers.map(([customer, count]) => (
                      <div key={customer} className="flex items-center justify-between">
                        <span className="font-medium text-slate-900">{customer}</span>
                        <Badge variant="outline">{count} jobs</Badge>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Completions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="w-5 h-5" />
                <span>Recent Completions</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentCompletions.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">No completed jobs yet</p>
              ) : (
                <div className="space-y-4">
                  {recentCompletions.map((job) => (
                    <div key={job.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-1">
                          <span className="font-medium">Job #{job.jobNumber}</span>
                          <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                            Completed
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600">{job.customer.name}</p>
                        <p className="text-sm text-slate-500">
                          {job.items.length} items • {formatTime(job.totalEstimatedTime || 0)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-slate-900">
                          {job.completedAt ? new Date(job.completedAt).toLocaleDateString() : 'N/A'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {job.completedAt ? new Date(job.completedAt).toLocaleTimeString() : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
