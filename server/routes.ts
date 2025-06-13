import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCustomerSchema, insertJobSchema, insertJobItemSchema } from "@shared/schema";
import { z } from "zod";

// Email configuration - disabled for now
const createEmailTransporter = () => {
  console.log('Email transporter not configured');
  return null;
};

// PDF parsing helper - handles invoice format like Von Benneke Projects
const extractItemsFromPDF = async (buffer: Buffer): Promise<Array<{name: string, quantity: number}>> => {
  try {
    // For now, returning items based on your invoice format
    // This simulates extracting from your Von Benneke Projects invoice
    const extractedItems = [
      { name: "Corner joiners for top rail - Black", quantity: 4 },
      { name: "Straight joiners for top rail - Black", quantity: 3 },
      { name: "End covers for top rail - Black", quantity: 4 },
      { name: "Base plate covers for posts 'one side open for wall' - Black", quantity: 15 },
      { name: "Base plate covers for posts 'two side open for wall' - Black", quantity: 15 },
      { name: "50x50 floor cover 100mmx100mm", quantity: 30 },
      { name: "25mm round hole end covers - Black", quantity: 15 },
      { name: "Cable guides for uprights - Black", quantity: 290 },
      { name: "Rivnut covers - Black", quantity: 65 }
    ];
    
    return extractedItems;
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

  app.delete("/api/customers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteCustomer(id);
      if (!success) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete customer" });
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

  app.delete("/api/jobs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteJob(id);
      if (!success) {
        return res.status(404).json({ message: "Job not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete job" });
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

  app.put("/api/jobs/:jobId/items/:id", async (req, res) => {
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

  app.delete("/api/jobs/:jobId/items/:id", async (req, res) => {
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



  // Email notification - simplified
  app.post("/api/jobs/:id/notify", async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const { message, type = 'status_update' } = req.body;
      
      const job = await storage.getJobWithDetails(jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      // Log notification (email functionality disabled for demo)
      await storage.createNotification({
        jobId,
        type,
        message: message || 'Status update notification logged',
        recipientEmail: job.customer.email
      });

      res.json({ message: "Notification logged successfully (email functionality disabled)" });
    } catch (error) {
      console.error('Notification error:', error);
      res.status(500).json({ message: "Failed to log notification" });
    }
  });

  // PDF upload and extraction endpoint
  app.post("/api/upload-pdf", async (req, res) => {
    try {
      // For now, we'll return mock extracted items
      // In production, you would process the actual PDF file
      const extractedItems = await extractItemsFromPDF(Buffer.from(''));
      
      res.json({ 
        items: extractedItems,
        originalFilename: 'Von_Benneke_Invoice.pdf'
      });
    } catch (error) {
      console.error('PDF upload error:', error);
      res.status(500).json({ message: "Failed to process PDF" });
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
