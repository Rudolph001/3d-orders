import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertCustomerSchema } from "@shared/schema";
import type { Customer, InsertCustomer } from "@shared/schema";

interface CustomerFormProps {
  customer?: Customer;
  onSuccess?: () => void;
}

export default function CustomerForm({ customer, onSuccess }: CustomerFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<InsertCustomer>({
    resolver: zodResolver(insertCustomerSchema),
    defaultValues: customer || {
      name: "",
      email: "",
      phone: "",
      company: "",
    },
  });

  const mutation = useMutation({
    mutationFn: (data: InsertCustomer) => {
      if (customer) {
        return apiRequest("PUT", `/api/customers/${customer.id}`, data);
      } else {
        return apiRequest("POST", "/api/customers", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({ 
        title: customer ? "Customer updated successfully" : "Customer created successfully" 
      });
      onSuccess?.();
      if (!customer) {
        form.reset();
      }
    },
    onError: () => {
      toast({ 
        title: customer ? "Failed to update customer" : "Failed to create customer", 
        variant: "destructive" 
      });
    },
  });

  const onSubmit = (data: InsertCustomer) => {
    mutation.mutate(data);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          {...form.register("name")}
          placeholder="Customer name"
        />
        {form.formState.errors.name && (
          <p className="text-sm text-destructive mt-1">{form.formState.errors.name.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="email">Email *</Label>
        <Input
          id="email"
          type="email"
          {...form.register("email")}
          placeholder="customer@example.com"
        />
        {form.formState.errors.email && (
          <p className="text-sm text-destructive mt-1">{form.formState.errors.email.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          {...form.register("phone")}
          placeholder="(555) 123-4567"
        />
      </div>

      <div>
        <Label htmlFor="company">Company</Label>
        <Input
          id="company"
          {...form.register("company")}
          placeholder="Company name"
        />
      </div>

      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending 
          ? (customer ? "Updating..." : "Creating...") 
          : (customer ? "Update Customer" : "Create Customer")
        }
      </Button>
    </form>
  );
}
