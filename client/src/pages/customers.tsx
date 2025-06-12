import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import CustomerForm from "@/components/customers/customer-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Users, Mail, Phone, Building, Edit } from "lucide-react";
import type { Customer } from "@shared/schema";

export default function Customers() {
  const [newCustomerModalOpen, setNewCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const filteredCustomers = customers.filter(customer => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      customer.name.toLowerCase().includes(query) ||
      customer.email.toLowerCase().includes(query) ||
      (customer.company && customer.company.toLowerCase().includes(query))
    );
  });

  const handleNewCustomerSuccess = () => {
    setNewCustomerModalOpen(false);
  };

  const handleEditCustomerSuccess = () => {
    setEditingCustomer(null);
  };

  return (
    <>
      <Header
        title="Customers"
        subtitle="Manage your customer information"
        showNewButton
        onNewClick={() => setNewCustomerModalOpen(true)}
        searchPlaceholder="Search customers..."
        onSearch={setSearchQuery}
      />

      <main className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-slate-600 mt-4">Loading customers...</p>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No customers found</h3>
            <p className="text-slate-600 mb-6">
              {searchQuery 
                ? `No customers match your search "${searchQuery}"`
                : "Add your first customer to get started"
              }
            </p>
            <Button onClick={() => setNewCustomerModalOpen(true)}>
              Add Customer
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCustomers.map((customer) => (
              <Card key={customer.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{customer.name}</CardTitle>
                      {customer.company && (
                        <Badge variant="outline" className="mt-1">
                          <Building className="w-3 h-3 mr-1" />
                          {customer.company}
                        </Badge>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingCustomer(customer)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm text-slate-600">
                      <Mail className="w-4 h-4" />
                      <span>{customer.email}</span>
                    </div>
                    {customer.phone && (
                      <div className="flex items-center space-x-2 text-sm text-slate-600">
                        <Phone className="w-4 h-4" />
                        <span>{customer.phone}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* New Customer Modal */}
      <Dialog open={newCustomerModalOpen} onOpenChange={setNewCustomerModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
          </DialogHeader>
          <CustomerForm onSuccess={handleNewCustomerSuccess} />
        </DialogContent>
      </Dialog>

      {/* Edit Customer Modal */}
      <Dialog open={!!editingCustomer} onOpenChange={() => setEditingCustomer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
          </DialogHeader>
          {editingCustomer && (
            <CustomerForm 
              customer={editingCustomer} 
              onSuccess={handleEditCustomerSuccess} 
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
