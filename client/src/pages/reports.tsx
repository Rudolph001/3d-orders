
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BarChart3, TrendingUp, Clock, Users, Calendar, FileText, Mail, Send, AlertCircle, CheckCircle } from "lucide-react";
import { formatTime } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import StatusBadge from "@/components/jobs/status-badge";
import type { JobWithCustomer, JobStats } from "@shared/schema";

export default function Reports() {
  const [selectedJob, setSelectedJob] = useState<JobWithCustomer | null>(null);
  const [updateMessage, setUpdateMessage] = useState("");
  const [estimatedCompletion, setEstimatedCompletion] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: jobs = [] } = useQuery<JobWithCustomer[]>({
    queryKey: ["/api/jobs"],
  });

  const { data: stats } = useQuery<JobStats>({
    queryKey: ["/api/stats"],
  });

  const notifyCustomerMutation = useMutation({
    mutationFn: (data: { jobId: number; message: string }) =>
      apiRequest("POST", `/api/jobs/${data.jobId}/notify`, { message: data.message }),
    onSuccess: () => {
      toast({ title: "Customer notification sent successfully" });
      setUpdateMessage("");
      setEstimatedCompletion("");
      setSelectedJob(null);
    },
    onError: () => {
      toast({ title: "Failed to send customer notification", variant: "destructive" });
    },
  });

  // Calculate additional metrics
  const completedJobs = jobs.filter(job => job.status === 'completed');
  const activeJobs = jobs.filter(job => job.status === 'printing' || job.status === 'paused');
  const pendingJobs = jobs.filter(job => job.status === 'not_started');
  
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
    .slice(0, 5);

  const getEstimatedCompletionDate = (job: JobWithCustomer) => {
    if (job.status === 'completed') return 'Completed';
    
    const remainingTime = job.totalEstimatedTime ? 
      Math.round((job.totalEstimatedTime * (100 - (job.progress || 0))) / 100) : 0;
    
    if (remainingTime === 0) return 'Soon';
    
    const completionDate = new Date();
    completionDate.setMinutes(completionDate.getMinutes() + remainingTime);
    
    return completionDate.toLocaleDateString() + ' at ' + completionDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleSendUpdate = () => {
    if (!selectedJob) return;
    
    const completionInfo = estimatedCompletion || getEstimatedCompletionDate(selectedJob);
    const message = updateMessage || 
      `Update on your print job #${selectedJob.jobNumber}: Current status is ${selectedJob.status.replace('_', ' ')}. ${selectedJob.progress ? `Progress: ${selectedJob.progress}%` : ''} Expected completion: ${completionInfo}`;
    
    notifyCustomerMutation.mutate({ jobId: selectedJob.id, message });
  };

  return (
    <>
      <Header
        title="Reports & Customer Updates"
        subtitle="Analytics, insights and customer communication for your 3D printing business"
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
                    <p className="text-sm font-medium text-slate-600">Active Jobs</p>
                    <p className="text-3xl font-bold text-slate-900 mt-2">{activeJobs.length}</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Completed Today</p>
                    <p className="text-3xl font-bold text-slate-900 mt-2">{stats?.completedToday || 0}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-success" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Queue Length</p>
                    <p className="text-3xl font-bold text-slate-900 mt-2">{pendingJobs.length}</p>
                  </div>
                  <Clock className="w-8 h-8 text-warning" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Active Jobs with Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5" />
                  <span>Active Jobs Progress</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activeJobs.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-4">No active jobs</p>
                  ) : (
                    activeJobs.map((job) => (
                      <div key={job.id} className="p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <span className="font-medium">Job #{job.jobNumber}</span>
                            <StatusBadge status={job.status} />
                          </div>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedJob(job)}
                              >
                                <Mail className="w-4 h-4 mr-1" />
                                Update Customer
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                              <DialogHeader>
                                <DialogTitle>Send Customer Update</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <p className="text-sm font-medium text-slate-700">Job: #{selectedJob?.jobNumber}</p>
                                  <p className="text-sm text-slate-600">Customer: {selectedJob?.customer.name}</p>
                                  <p className="text-sm text-slate-600">Email: {selectedJob?.customer.email}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-slate-700">Custom Message (optional)</label>
                                  <Textarea
                                    value={updateMessage}
                                    onChange={(e) => setUpdateMessage(e.target.value)}
                                    placeholder="Add a custom message for the customer..."
                                    className="mt-1"
                                  />
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-slate-700">Estimated Completion (optional)</label>
                                  <Input
                                    value={estimatedCompletion}
                                    onChange={(e) => setEstimatedCompletion(e.target.value)}
                                    placeholder="e.g., Tomorrow at 2 PM, or Jan 15th"
                                    className="mt-1"
                                  />
                                  <p className="text-xs text-slate-500 mt-1">
                                    Auto-calculated: {selectedJob ? getEstimatedCompletionDate(selectedJob) : ''}
                                  </p>
                                </div>
                                <Button
                                  onClick={handleSendUpdate}
                                  disabled={notifyCustomerMutation.isPending}
                                  className="w-full"
                                >
                                  <Send className="w-4 h-4 mr-2" />
                                  Send Update
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                        <p className="text-sm text-slate-600 mb-2">{job.customer.name}</p>
                        <div className="flex items-center justify-between text-sm text-slate-600 mb-2">
                          <span>Progress: {job.progress || 0}%</span>
                          <span>Est. completion: {getEstimatedCompletionDate(job)}</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${job.progress || 0}%` }}
                          />
                        </div>
                        <p className="text-xs text-slate-500 mt-2">
                          {job.items.length} items • {formatTime(job.totalEstimatedTime || 0)} total
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

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
                    { status: 'completed', label: 'Completed', count: completedJobs.length, color: 'success' },
                    { status: 'printing', label: 'Printing', count: jobs.filter(j => j.status === 'printing').length, color: 'primary' },
                    { status: 'not_started', label: 'Not Started', count: pendingJobs.length, color: 'slate' },
                    { status: 'paused', label: 'Paused', count: jobs.filter(j => j.status === 'paused').length, color: 'warning' },
                  ].map(({ status, label, count, color }) => (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Badge variant="outline" className={`
                          ${color === 'success' ? 'bg-success/10 text-success border-success/20' : ''}
                          ${color === 'primary' ? 'bg-primary/10 text-primary border-primary/20' : ''}
                          ${color === 'slate' ? 'bg-slate-100 text-slate-600 border-slate-200' : ''}
                          ${color === 'warning' ? 'bg-warning/10 text-warning border-warning/20' : ''}
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
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Pending Jobs Queue */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5" />
                  <span>Pending Jobs Queue</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pendingJobs.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-8">No pending jobs</p>
                ) : (
                  <div className="space-y-3">
                    {pendingJobs.slice(0, 5).map((job, index) => (
                      <div key={job.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-1">
                            <span className="text-sm font-medium">#{index + 1}</span>
                            <span className="font-medium">Job #{job.jobNumber}</span>
                          </div>
                          <p className="text-sm text-slate-600">{job.customer.name}</p>
                          <p className="text-sm text-slate-500">
                            {job.items.length} items • Est. {formatTime(job.totalEstimatedTime || 0)}
                          </p>
                        </div>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedJob(job)}
                            >
                              <Mail className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                        </Dialog>
                      </div>
                    ))}
                    {pendingJobs.length > 5 && (
                      <p className="text-sm text-slate-500 text-center">
                        +{pendingJobs.length - 5} more jobs in queue
                      </p>
                    )}
                  </div>
                )}
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
                    <div key={job.id} className="flex items-center justify-between p-4 bg-success/5 border border-success/20 rounded-lg">
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
