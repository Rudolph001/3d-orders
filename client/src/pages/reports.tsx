import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, User, Package, AlertCircle, CheckCircle, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { formatTime } from "@/lib/utils";
import StatusBadge from "@/components/jobs/status-badge";
import type { JobWithCustomer } from "@shared/schema";

export default function Reports() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedJob, setSelectedJob] = useState<JobWithCustomer | null>(null);
  const [updateMessage, setUpdateMessage] = useState("");
  const [estimatedCompletion, setEstimatedCompletion] = useState("");

  const { data: jobs = [], isLoading } = useQuery<JobWithCustomer[]>({
    queryKey: ["/api/jobs"],
  });

  const updateJobMutation = useMutation({
    mutationFn: (data: { jobId: number; progress?: number; status?: string; estimatedCompletion?: string }) =>
      apiRequest("PUT", `/api/jobs/${data.jobId}`, {
        progress: data.progress,
        status: data.status,
        notes: data.estimatedCompletion ? `${selectedJob?.notes ? selectedJob.notes + '\n' : ''}Estimated Completion: ${data.estimatedCompletion}` : selectedJob?.notes
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({ title: "Job updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update job", variant: "destructive" });
    },
  });

  const notifyCustomerMutation = useMutation({
    mutationFn: (message: string) =>
      apiRequest("POST", `/api/jobs/${selectedJob?.id}/notify`, { message }),
    onSuccess: () => {
      toast({ title: "Customer notification sent successfully" });
      setUpdateMessage("");
    },
    onError: () => {
      toast({ title: "Failed to send notification", variant: "destructive" });
    },
  });

  const calculateProgress = (job: JobWithCustomer) => {
    switch (job.status) {
      case "not_started": return 0;
      case "printing": return job.progress || 25;
      case "paused": return job.progress || 25;
      case "completed": return 100;
      default: return 0;
    }
  };

  const getEstimatedCompletionDate = (job: JobWithCustomer) => {
    if (job.status === "completed") return "Completed";

    const totalTime = job.totalEstimatedTime || 0;
    const currentProgress = calculateProgress(job);
    const remainingTime = totalTime * (1 - currentProgress / 100);

    if (remainingTime <= 0) return "Soon";

    const completionDate = new Date();
    completionDate.setMinutes(completionDate.getMinutes() + remainingTime);

    return completionDate.toLocaleDateString() + " " + completionDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "not_started": return "bg-gray-100 text-gray-800";
      case "printing": return "bg-blue-100 text-blue-800";
      case "paused": return "bg-yellow-100 text-yellow-800";
      case "completed": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const handleProgressUpdate = (jobId: number, newProgress: number) => {
    updateJobMutation.mutate({ jobId, progress: newProgress });
  };

  const handleStatusUpdate = (jobId: number, newStatus: string) => {
    updateJobMutation.mutate({ jobId, status: newStatus });
  };

  const handleCompletionEstimate = (jobId: number) => {
    updateJobMutation.mutate({ jobId, estimatedCompletion });
    setEstimatedCompletion("");
  };

  const sendCustomerUpdate = () => {
    if (!selectedJob) return;

    const progress = calculateProgress(selectedJob);
    const estimatedCompletion = getEstimatedCompletionDate(selectedJob);

    const defaultMessage = `Hello! Here's an update on your print job ${selectedJob.jobNumber}:

Status: ${selectedJob.status.replace('_', ' ').toUpperCase()}
Progress: ${progress}% complete
Estimated Completion: ${estimatedCompletion}

${selectedJob.items.map(item => 
  `• ${item.name} (Qty: ${item.quantity})${item.material ? ` - ${item.material}` : ''}`
).join('\n')}

${updateMessage ? '\nAdditional notes: ' + updateMessage : ''}

Thank you for your business!`;

    notifyCustomerMutation.mutate(defaultMessage);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">Job Reports & Customer Updates</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Jobs List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-800">Active Jobs</h2>

          {jobs.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center h-32">
                <p className="text-slate-500">No jobs found</p>
              </CardContent>
            </Card>
          ) : (
            jobs.map((job) => (
              <Card 
                key={job.id} 
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedJob?.id === job.id ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => setSelectedJob(job)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{job.jobNumber}</CardTitle>
                    <Badge className={getStatusColor(job.status)}>
                      {job.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <User className="w-4 h-4" />
                    <span>{job.customer.name}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Package className="w-4 h-4" />
                    <span>{job.items.length} item(s)</span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{calculateProgress(job)}%</span>
                    </div>
                    <Progress value={calculateProgress(job)} className="h-2" />
                  </div>

                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Clock className="w-4 h-4" />
                    <span>Est. Completion: {getEstimatedCompletionDate(job)}</span>
                  </div>

                  {job.dueDate && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Calendar className="w-4 h-4" />
                      <span>Due: {new Date(job.dueDate).toLocaleDateString()}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Job Details & Customer Update Panel */}
        <div className="space-y-4">
          {selectedJob ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Job Details - {selectedJob.jobNumber}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-slate-600">Customer</Label>
                      <p className="text-slate-900">{selectedJob.customer.name}</p>
                      <p className="text-sm text-slate-500">{selectedJob.customer.email}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-slate-600">Status</Label>
                      <div className="mt-1">
                        <Select
                          value={selectedJob.status}
                          onValueChange={(value) => handleStatusUpdate(selectedJob.id, value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="not_started">Not Started</SelectItem>
                            <SelectItem value="printing">Printing</SelectItem>
                            <SelectItem value="paused">Paused</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-slate-600">Progress</Label>
                    <div className="mt-2 space-y-2">
                      <Progress value={calculateProgress(selectedJob)} className="h-3" />
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={calculateProgress(selectedJob)}
                        onChange={(e) => handleProgressUpdate(selectedJob.id, parseInt(e.target.value) || 0)}
                        className="w-20"
                        placeholder="0-100"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-slate-600">Items</Label>
                    <div className="mt-2 space-y-2">
                      {selectedJob.items.map((item, index) => (
                        <div key={index} className="p-3 bg-slate-50 rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{item.name}</p>
                              <p className="text-sm text-slate-600">Quantity: {item.quantity}</p>
                              {item.material && (
                                <p className="text-sm text-slate-600">Material: {item.material}</p>
                              )}
                              {item.estimatedTimePerItem && (
                                <p className="text-sm text-slate-600">
                                  Est. Time: {formatTime(item.estimatedTimePerItem)} per item
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-slate-600">Update Completion Estimate</Label>
                    <div className="mt-2 flex gap-2">
                      <Input
                        type="datetime-local"
                        value={estimatedCompletion}
                        onChange={(e) => setEstimatedCompletion(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        onClick={() => handleCompletionEstimate(selectedJob.id)}
                        disabled={!estimatedCompletion}
                        size="sm"
                      >
                        Update
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    Send Customer Update
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="update-message">Additional Message (Optional)</Label>
                    <Textarea
                      id="update-message"
                      placeholder="Add any specific notes or updates for the customer..."
                      value={updateMessage}
                      onChange={(e) => setUpdateMessage(e.target.value)}
                      className="mt-2"
                    />
                  </div>

                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Preview of customer notification:</h4>
                    <div className="text-sm text-blue-800 whitespace-pre-line">
                      {`Status: ${selectedJob.status.replace('_', ' ').toUpperCase()}
Progress: ${calculateProgress(selectedJob)}% complete
Estimated Completion: ${getEstimatedCompletionDate(selectedJob)}`}
                    </div>
                  </div>

                  <Button
                    onClick={sendCustomerUpdate}
                    disabled={notifyCustomerMutation.isPending}
                    className="w-full"
                  >
                    {notifyCustomerMutation.isPending ? "Sending..." : "Send Customer Update"}
                  </Button>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-500">Select a job to view details and send customer updates</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}