import { pgTable, text, serial, integer, boolean, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  company: text("company"),
});

export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  jobNumber: text("job_number").notNull().unique(),
  status: text("status").notNull().default("not_started"), // not_started, printing, paused, completed
  priority: text("priority").notNull().default("normal"), // normal, high, urgent
  dueDate: timestamp("due_date"),
  notes: text("notes"),
  totalEstimatedTime: integer("total_estimated_time").default(0), // in minutes
  actualTime: integer("actual_time"), // in minutes
  progress: integer("progress").default(0), // percentage 0-100
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const jobItems = pgTable("job_items", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull(),
  name: text("name").notNull(),
  quantity: integer("quantity").notNull(),
  estimatedTimePerItem: integer("estimated_time_per_item").default(0), // in minutes
  material: text("material"),
  notes: text("notes"),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull(),
  type: text("type").notNull(), // status_update, completion, delay
  message: text("message").notNull(),
  sentAt: timestamp("sent_at").defaultNow(),
  recipientEmail: text("recipient_email").notNull(),
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
});

export const insertJobSchema = createInsertSchema(jobs).omit({
  id: true,
  jobNumber: true,
  createdAt: true,
  completedAt: true,
});

export const insertJobItemSchema = createInsertSchema(jobItems).omit({
  id: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  sentAt: true,
});

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

export type Job = typeof jobs.$inferSelect;
export type InsertJob = z.infer<typeof insertJobSchema>;

export type JobItem = typeof jobItems.$inferSelect;
export type InsertJobItem = z.infer<typeof insertJobItemSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

// Extended types for API responses
export type JobWithCustomer = Job & {
  customer: Customer;
  items: JobItem[];
};

export type JobStats = {
  activeJobs: number;
  completedToday: number;
  totalPrintTime: number;
  queueLength: number;
};
