import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCustomerSchema, insertJobSchema, insertJobItemSchema } from "@shared/schema";
import multer from "multer";
import PDFParse from "pdf-parse";
import nodemailer from "nodemailer";
import { z } from "zod";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

// Email configuration
const createEmailTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER || process.env.SMTP_USER,
      pass: process.env.EMAIL_PASS || process.env.SMTP_PASS,
    },
  });
};

// PDF parsing helper
const extractItemsFromPDF = async (buffer: Buffer): Promise<Array<{name: string, quantity: number}>> => {
  try {
    const data = await PDFParse(buffer);
    const text = data.text;
    
    // Simple regex patterns to extract items and quantities
    // This is a basic implementation - in production, you'd want more sophisticated parsing
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    const items: Array<{name: string, quantity: number}> = [];
    
    for (const line of lines) {
      // Look for patterns like "2x Item Name" or "Item Name - 2"
      const qtyMatch = line.match(/(\d+)\s*[x×]\s*(.+)/i) || 
                      line.match(/(.+?)\s*[-–]\s*(\d+)/i) ||
                      line.match(/(.+?)\s*(\d+)$/);
      
      if (qtyMatch) {
        let name: string, quantity: number;
        
        if (line.match(/(\d+)\s*[x×]\s*(.+)/i)) {
          quantity = parseInt(qtyMatch[1]);
          name = qtyMatch[2].trim();
        } else {
          name = qtyMatch[1].trim();
          quantity = parseInt(qtyMatch[2]);
        }
        
        if (!isNaN(quantity) && name.length > 2) {
          items.push({ name, quantity });
        }
      }
    }
    
    return items;
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error('Failed to parse PDF');
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Customer routes
  app.get("/api/customers", async (req, res) => {
    try {
      const customers = await storage.getAllCustomers();
      res.json(customers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });

  app.post("/api/customers", async (req, res) => {
    try {
      const customerData = insertCustomerSchema.parse(req.body);
      const customer = await storage.createCustomer(customerData);
      res.status(201).json(customer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid customer data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create customer" });
      }
    }
  });

  app.get("/api/customers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const customer = await storage.getCustomer(id);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch customer" });
    }
  });

  app.put("/api/customers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const customerData = insertCustomerSchema.partial().parse(req.body);
      const customer = await storage.updateCustomer(id, customerData);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid customer data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update customer" });
      }
    }
  });

  // Job routes
  app.get("/api/jobs", async (req, res) => {
    try {
      const { status } = req.query;
      let jobs;
      
      if (status && typeof status === 'string') {
        jobs = await storage.getJobsByStatus(status);
      } else {
        jobs = await storage.getAllJobs();
      }
      
      res.json(jobs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch jobs" });
    }
  });

  app.get("/api/jobs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const job = await storage.getJobWithDetails(id);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      res.json(job);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch job" });
    }
  });

  app.post("/api/jobs", async (req, res) => {
    try {
      const jobData = insertJobSchema.parse(req.body);
      const job = await storage.createJob(jobData);
      
      // Create job items if provided
      if (req.body.items && Array.isArray(req.body.items)) {
        for (const itemData of req.body.items) {
          const item = insertJobItemSchema.parse({ ...itemData, jobId: job.id });
          await storage.createJobItem(item);
        }
      }
      
      const jobWithDetails = await storage.getJobWithDetails(job.id);
      res.status(201).json(jobWithDetails);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid job data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create job" });
      }
    }
  });

  app.put("/api/jobs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const jobData = insertJobSchema.partial().parse(req.body);
      const job = await storage.updateJob(id, jobData);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      const jobWithDetails = await storage.getJobWithDetails(job.id);
      res.json(jobWithDetails);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid job data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update job" });
      }
    }
  });

  // Job item routes
  app.get("/api/jobs/:jobId/items", async (req, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const items = await storage.getJobItems(jobId);
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch job items" });
    }
  });

  app.post("/api/jobs/:jobId/items", async (req, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const itemData = insertJobItemSchema.parse({ ...req.body, jobId });
      const item = await storage.createJobItem(itemData);
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid item data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create item" });
      }
    }
  });

  app.put("/api/job-items/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const itemData = insertJobItemSchema.partial().parse(req.body);
      const item = await storage.updateJobItem(id, itemData);
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }
      res.json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid item data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update item" });
      }
    }
  });

  app.delete("/api/job-items/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteJobItem(id);
      if (!success) {
        return res.status(404).json({ message: "Item not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete item" });
    }
  });

  // PDF upload and processing
  app.post("/api/upload-pdf", upload.single('pdf'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No PDF file uploaded" });
      }

      const extractedItems = await extractItemsFromPDF(req.file.buffer);
      
      res.json({
        message: "PDF processed successfully",
        items: extractedItems,
        originalFilename: req.file.originalname
      });
    } catch (error) {
      console.error('PDF upload error:', error);
      res.status(500).json({ message: "Failed to process PDF" });
    }
  });

  // Email notification
  app.post("/api/jobs/:id/notify", async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const { message, type = 'status_update' } = req.body;
      
      const job = await storage.getJobWithDetails(jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      // Create email transporter
      const transporter = createEmailTransporter();
      
      // Send email
      const emailContent = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: job.customer.email,
        subject: `Print Job Update - ${job.jobNumber}`,
        html: `
          <h2>Print Job Update</h2>
          <p><strong>Job:</strong> ${job.jobNumber}</p>
          <p><strong>Status:</strong> ${job.status.replace('_', ' ').toUpperCase()}</p>
          <p><strong>Message:</strong></p>
          <p>${message || 'Your print job status has been updated.'}</p>
          <br>
          <p>Best regards,<br>PrintTracker Team</p>
        `
      };

      await transporter.sendMail(emailContent);

      // Log notification
      await storage.createNotification({
        jobId,
        type,
        message: message || 'Status update notification sent',
        recipientEmail: job.customer.email
      });

      res.json({ message: "Notification sent successfully" });
    } catch (error) {
      console.error('Email notification error:', error);
      res.status(500).json({ message: "Failed to send notification" });
    }
  });

  // Stats endpoint
  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getJobStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
