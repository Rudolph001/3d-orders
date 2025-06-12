import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Edit, Mail, Play, Pause, Check, Eye, File, Archive } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import StatusBadge from "./status-badge";
import { formatTime } from "@/lib/utils";
import type { JobWithCustomer } from "@shared/schema";

interface JobCardProps {
  job: JobWithCustomer;
}

export default function JobCard({ job }: JobCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [notificationMessage, setNotificationMessage] = useState("");

  const updateJobMutation = useMutation({
    mutationFn: (data: { status?: string; progress?: number }) =>
      apiRequest("PUT", `/api/jobs/${job.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Job updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update job", variant: "destructive" });
    },
  });

  const notifyCustomerMutation = useMutation({
    mutationFn: (message: string) =>
      apiRequest("POST", `/api/jobs/${job.id}/notify`, { message }),
    onSuccess: () => {
      toast({ title: "Customer notified successfully" });
      setNotificationMessage("");
    },
    onError: () => {
      toast({ title: "Failed to notify customer", variant: "destructive" });
    },
  });

  const handleStatusChange = (newStatus: string, progress?: number) => {
    updateJobMutation.mutate({ status: newStatus, progress });
  };

  const handleNotifyCustomer = () => {
    const message = notificationMessage || `Your print job ${job.jobNumber} status has been updated to ${job.status.replace('_', ' ')}.`;
    notifyCustomerMutation.mutate(message);
  };

  const getActionButtons = () => {
    switch (job.status) {
      case 'not_started':
        return (
          <Button
            size="sm"
            onClick={() => handleStatusChange('printing')}
            disabled={updateJobMutation.isPending}
          >
            <Play className="w-4 h-4 mr-1" />
            Start
          </Button>
        );
      case 'printing':
        return (
          <>
            <Button
              size="sm"
              variant="outline"
              className="bg-warning text-white hover:bg-yellow-600"
              onClick={() => handleStatusChange('paused')}
              disabled={updateJobMutation.isPending}
            >
              <Pause className="w-4 h-4 mr-1" />
              Pause
            </Button>
            <Button
              size="sm"
              className="bg-success text-white hover:bg-green-600"
              onClick={() => handleStatusChange('completed', 100)}
              disabled={updateJobMutation.isPending}
            >
              <Check className="w-4 h-4 mr-1" />
              Complete
            </Button>
          </>
        );
      case 'paused':
        return (
          <>
            <Button
              size="sm"
              onClick={() => handleStatusChange('printing')}
              disabled={updateJobMutation.isPending}
            >
              <Play className="w-4 h-4 mr-1" />
              Resume
            </Button>
            <Button
              size="sm"
              className="bg-success text-white hover:bg-green-600"
              onClick={() => handleStatusChange('completed', 100)}
              disabled={updateJobMutation.isPending}
            >
              <Check className="w-4 h-4 mr-1" />
              Complete
            </Button>
          </>
        );
      case 'completed':
        return (
          <>
            <Button size="sm">
              <File className="w-4 h-4 mr-1" />
              Generate Invoice
            </Button>
            <Button size="sm" variant="outline">
              <Archive className="w-4 h-4 mr-1" />
              Archive
            </Button>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h4 className="font-semibold text-slate-900">Job #{job.jobNumber}</h4>
              <StatusBadge status={job.status} />
            </div>
            <p className="text-sm text-slate-600 mb-1">{job.customer.name}</p>
            <p className="text-sm text-slate-500">
              {job.items.length} items • Estimated {formatTime(job.totalEstimatedTime || 0)}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button size="sm" variant="ghost">
              <Edit className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={handleNotifyCustomer}>
              <Mail className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Progress Bar for active jobs */}
        {(job.status === 'printing' || job.status === 'paused') && (
          <div className="mb-3">
            <div className="flex justify-between text-sm text-slate-600 mb-1">
              <span>Progress</span>
              <span>{job.progress || 0}%</span>
            </div>
            <Progress value={job.progress || 0} className="h-2" />
          </div>
        )}

        {/* Job Items */}
        <div className="bg-slate-50 rounded-lg p-3 mb-3">
          <h5 className="text-sm font-medium text-slate-700 mb-2">Items:</h5>
          <div className="space-y-1 text-sm text-slate-600">
            {job.items.map((item) => (
              <div key={item.id} className="flex justify-between">
                <span>{item.name}</span>
                <span>{item.quantity}x • {formatTime(item.estimatedTimePerItem || 0)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Completion Info for completed jobs */}
        {job.status === 'completed' && job.completedAt && (
          <div className="bg-success/5 border border-success/20 rounded-lg p-3 mb-3">
            <div className="flex items-center text-sm text-success">
              <Check className="w-4 h-4 mr-2" />
              <span>Completed {new Date(job.completedAt).toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          {getActionButtons()}
          <Button size="sm" variant="outline">
            <Eye className="w-4 h-4 mr-1" />
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
