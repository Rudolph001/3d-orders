import { 
  customers, 
  jobs, 
  jobItems, 
  notifications,
  type Customer, 
  type InsertCustomer,
  type Job,
  type InsertJob,
  type JobItem,
  type InsertJobItem,
  type Notification,
  type InsertNotification,
  type JobWithCustomer,
  type JobStats
} from "@shared/schema";

export interface IStorage {
  // Customers
  getCustomer(id: number): Promise<Customer | undefined>;
  getCustomerByEmail(email: string): Promise<Customer | undefined>;
  getAllCustomers(): Promise<Customer[]>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, customer: Partial<InsertCustomer>): Promise<Customer | undefined>;
  deleteCustomer(id: number): Promise<boolean>;

  // Jobs
  getJob(id: number): Promise<Job | undefined>;
  getJobWithDetails(id: number): Promise<JobWithCustomer | undefined>;
  getAllJobs(): Promise<JobWithCustomer[]>;
  getJobsByStatus(status: string): Promise<JobWithCustomer[]>;
  createJob(job: InsertJob): Promise<Job>;
  updateJob(id: number, job: Partial<InsertJob>): Promise<Job | undefined>;
  deleteJob(id: number): Promise<boolean>;
  generateJobNumber(): string;

  // Job Items
  getJobItems(jobId: number): Promise<JobItem[]>;
  createJobItem(item: InsertJobItem): Promise<JobItem>;
  updateJobItem(id: number, item: Partial<InsertJobItem>): Promise<JobItem | undefined>;
  deleteJobItem(id: number): Promise<boolean>;

  // Notifications
  createNotification(notification: InsertNotification): Promise<Notification>;
  getJobNotifications(jobId: number): Promise<Notification[]>;

  // Stats
  getJobStats(): Promise<JobStats>;
}

export class MemStorage implements IStorage {
  private customers: Map<number, Customer>;
  private jobs: Map<number, Job>;
  private jobItems: Map<number, JobItem>;
  private notifications: Map<number, Notification>;
  private currentCustomerId: number;
  private currentJobId: number;
  private currentJobItemId: number;
  private currentNotificationId: number;
  private jobCounter: number;

  constructor() {
    this.customers = new Map();
    this.jobs = new Map();
    this.jobItems = new Map();
    this.notifications = new Map();
    this.currentCustomerId = 1;
    this.currentJobId = 1;
    this.currentJobItemId = 1;
    this.currentNotificationId = 1;
    this.jobCounter = 1;

    // Add some initial data
    this.initializeData();
  }

  private async initializeData() {
    // Create sample customers
    const customer1 = await this.createCustomer({
      name: "Tech Solutions Inc.",
      email: "contact@techsolutions.com",
      phone: "(555) 123-4567",
      company: "Tech Solutions Inc."
    });

    const customer2 = await this.createCustomer({
      name: "Creative Design Studio",
      email: "hello@creativedesign.com",
      phone: "(555) 987-6543",
      company: "Creative Design Studio"
    });

    const customer3 = await this.createCustomer({
      name: "Manufacturing Co.",
      email: "orders@manufacturing.com",
      phone: "(555) 456-7890",
      company: "Manufacturing Co."
    });
  }

  generateJobNumber(): string {
    const year = new Date().getFullYear();
    const number = String(this.jobCounter++).padStart(3, '0');
    return `${year}-${number}`;
  }

  // Customer methods
  async getCustomer(id: number): Promise<Customer | undefined> {
    return this.customers.get(id);
  }

  async getCustomerByEmail(email: string): Promise<Customer | undefined> {
    return Array.from(this.customers.values()).find(customer => customer.email === email);
  }

  async getAllCustomers(): Promise<Customer[]> {
    return Array.from(this.customers.values());
  }

  async createCustomer(insertCustomer: InsertCustomer): Promise<Customer> {
    const id = this.currentCustomerId++;
    const customer: Customer = { 
      ...insertCustomer, 
      id,
      phone: insertCustomer.phone ?? null,
      company: insertCustomer.company ?? null
    };
    this.customers.set(id, customer);
    return customer;
  }

  async updateCustomer(id: number, customerUpdate: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const existing = this.customers.get(id);
    if (!existing) return undefined;

    const updated: Customer = { ...existing, ...customerUpdate };
    this.customers.set(id, updated);
    return updated;
  }

  async deleteCustomer(id: number): Promise<boolean> {
    // Delete the customer
    return this.customers.delete(id);
  }

  // Job methods
  async getJob(id: number): Promise<Job | undefined> {
    return this.jobs.get(id);
  }

  async getJobWithDetails(id: number): Promise<JobWithCustomer | undefined> {
    const job = this.jobs.get(id);
    if (!job) return undefined;

    const customer = this.customers.get(job.customerId);
    if (!customer) return undefined;

    const items = Array.from(this.jobItems.values()).filter(item => item.jobId === id);

    return {
      ...job,
      customer,
      items
    };
  }

  async getAllJobs(): Promise<JobWithCustomer[]> {
    const jobsWithDetails: JobWithCustomer[] = [];

    for (const job of Array.from(this.jobs.values())) {
      const customer = this.customers.get(job.customerId);
      if (customer) {
        const items = Array.from(this.jobItems.values()).filter(item => item.jobId === job.id);
        jobsWithDetails.push({
          ...job,
          customer,
          items
        });
      }
    }

    return jobsWithDetails.sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return b.id - a.id;
    });
  }

  async getJobsByStatus(status: string): Promise<JobWithCustomer[]> {
    const allJobs = await this.getAllJobs();
    return allJobs.filter(job => job.status === status);
  }

  async createJob(insertJob: InsertJob): Promise<Job> {
    const id = this.currentJobId++;
    const jobNumber = this.generateJobNumber();
    const job: Job = { 
      ...insertJob, 
      id, 
      jobNumber,
      createdAt: new Date(),
      completedAt: null,
      dueDate: insertJob.dueDate ?? null,
      notes: insertJob.notes ?? null,
      totalEstimatedTime: insertJob.totalEstimatedTime ?? null,
      actualTime: insertJob.actualTime ?? null,
      progress: insertJob.progress ?? null
    };
    this.jobs.set(id, job);
    return job;
  }

  async updateJob(id: number, jobUpdate: Partial<InsertJob>): Promise<Job | undefined> {
    const existing = this.jobs.get(id);
    if (!existing) return undefined;

    const updated: Job = { 
      ...existing, 
      ...jobUpdate,
      completedAt: jobUpdate.status === 'completed' ? new Date() : existing.completedAt
    };
    this.jobs.set(id, updated);
    return updated;
  }

  async deleteJob(id: number): Promise<boolean> {
    // Delete associated job items first
    const jobItems = Array.from(this.jobItems.values()).filter(item => item.jobId === id);
    jobItems.forEach(item => this.jobItems.delete(item.id));

    // Delete the job
    return this.jobs.delete(id);
  }

  // Job Item methods
  async getJobItems(jobId: number): Promise<JobItem[]> {
    return Array.from(this.jobItems.values()).filter(item => item.jobId === jobId);
  }

  async createJobItem(insertItem: InsertJobItem): Promise<JobItem> {
    const id = this.currentJobItemId++;
    const item: JobItem = { 
      ...insertItem, 
      id,
      notes: insertItem.notes ?? null,
      estimatedTimePerItem: insertItem.estimatedTimePerItem ?? null,
      material: insertItem.material ?? null,
      status: insertItem.status ?? "not_started",
      completedQuantity: insertItem.completedQuantity ?? 0,
      actualTimePerItem: insertItem.actualTimePerItem ?? null
    };
    this.jobItems.set(id, item);

    // Update job total estimated time and progress
    await this.updateJobTotalTime(insertItem.jobId);
    await this.updateJobProgress(insertItem.jobId);

    return item;
  }

  async updateJobItem(id: number, itemUpdate: Partial<InsertJobItem>): Promise<JobItem | undefined> {
    const existing = this.jobItems.get(id);
    if (!existing) return undefined;

    const updated: JobItem = { ...existing, ...itemUpdate };
    this.jobItems.set(id, updated);

    // Update job total estimated time and progress
    await this.updateJobTotalTime(existing.jobId);
    await this.updateJobProgress(existing.jobId);

    return updated;
  }

  async deleteJobItem(id: number): Promise<boolean> {
    const item = this.jobItems.get(id);
    if (!item) return false;

    this.jobItems.delete(id);

    // Update job total estimated time
    await this.updateJobTotalTime(item.jobId);

    return true;
  }

  private async updateJobTotalTime(jobId: number): Promise<void> {
    const items = await this.getJobItems(jobId);
    const totalTime = items.reduce((sum, item) => {
      return sum + (item.estimatedTimePerItem || 0) * item.quantity;
    }, 0);

    await this.updateJob(jobId, { totalEstimatedTime: totalTime });
  }

  private async updateJobProgress(jobId: number): Promise<void> {
    const items = await this.getJobItems(jobId);
    
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const completedItems = items.reduce((sum, item) => sum + (item.completedQuantity || 0), 0);
    
    const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
    
    // Update job status based on progress
    let status = "not_started";
    if (progress > 0 && progress < 100) {
      status = "printing";
    } else if (progress === 100) {
      status = "completed";
    }
    
    await this.updateJob(jobId, { progress, status });
  }

  // Notification methods
  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const id = this.currentNotificationId++;
    const notification: Notification = { 
      ...insertNotification, 
      id,
      sentAt: new Date()
    };
    this.notifications.set(id, notification);
    return notification;
  }

  async getJobNotifications(jobId: number): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .filter(notification => notification.jobId === jobId)
      .sort((a, b) => {
        const dateA = a.sentAt ? new Date(a.sentAt).getTime() : 0;
        const dateB = b.sentAt ? new Date(b.sentAt).getTime() : 0;
        return dateB - dateA;
      });
  }

  // Stats methods
  async getJobStats(): Promise<JobStats> {
    const allJobs = Array.from(this.jobs.values());
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeJobs = allJobs.filter(job => 
      job.status === 'printing' || job.status === 'paused'
    ).length;

    const completedToday = allJobs.filter(job => 
      job.status === 'completed' && 
      job.completedAt && 
      new Date(job.completedAt) >= today
    ).length;

    const totalPrintTime = Math.round(allJobs.reduce((sum, job) => {
      return sum + (job.totalEstimatedTime || 0);
    }, 0) / 60); // Convert to hours

    const queueLength = allJobs.filter(job => job.status === 'not_started').length;

    return {
      activeJobs,
      completedToday,
      totalPrintTime,
      queueLength
    };
  }
}

export const storage = new MemStorage();