import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import JobCard from "@/components/jobs/job-card";
import NewJobModal from "@/components/jobs/new-job-modal";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import type { JobWithCustomer } from "@shared/schema";

export default function Jobs() {
  const [newJobModalOpen, setNewJobModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: jobs = [], isLoading } = useQuery<JobWithCustomer[]>({
    queryKey: ["/api/jobs"],
  });

  const filteredJobs = jobs.filter(job => {
    const matchesStatus = statusFilter === "all" || job.status === statusFilter;
    const matchesSearch = searchQuery === "" || 
      job.jobNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.items.some(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesStatus && matchesSearch;
  });

  return (
    <>
      <Header
        title="Print Jobs"
        subtitle="Manage all your 3D printing jobs"
        showNewButton
        onNewClick={() => setNewJobModalOpen(true)}
        searchPlaceholder="Search jobs..."
        onSearch={setSearchQuery}
      />

      <main className="flex-1 overflow-auto p-6">
        {/* Filter Buttons */}
        <div className="flex items-center space-x-2 mb-6">
          <Button
            size="sm"
            variant={statusFilter === "all" ? "default" : "outline"}
            onClick={() => setStatusFilter("all")}
          >
            All ({jobs.length})
          </Button>
          <Button
            size="sm"
            variant={statusFilter === "not_started" ? "default" : "outline"}
            onClick={() => setStatusFilter("not_started")}
          >
            Not Started ({jobs.filter(j => j.status === "not_started").length})
          </Button>
          <Button
            size="sm"
            variant={statusFilter === "printing" ? "default" : "outline"}
            onClick={() => setStatusFilter("printing")}
          >
            Printing ({jobs.filter(j => j.status === "printing").length})
          </Button>
          <Button
            size="sm"
            variant={statusFilter === "paused" ? "default" : "outline"}
            onClick={() => setStatusFilter("paused")}
          >
            Paused ({jobs.filter(j => j.status === "paused").length})
          </Button>
          <Button
            size="sm"
            variant={statusFilter === "completed" ? "default" : "outline"}
            onClick={() => setStatusFilter("completed")}
          >
            Completed ({jobs.filter(j => j.status === "completed").length})
          </Button>
        </div>

        {/* Jobs List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-slate-600 mt-4">Loading jobs...</p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No jobs found</h3>
            <p className="text-slate-600 mb-6">
              {searchQuery 
                ? `No jobs match your search "${searchQuery}"`
                : statusFilter === "all" 
                  ? "Create your first job to get started"
                  : `No jobs with status "${statusFilter}"`
              }
            </p>
            <Button onClick={() => setNewJobModalOpen(true)}>
              Create New Job
            </Button>
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </main>

      <NewJobModal open={newJobModalOpen} onOpenChange={setNewJobModalOpen} />
    </>
  );
}
