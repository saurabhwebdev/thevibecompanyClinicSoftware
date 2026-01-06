"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, Send, Users, Building2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Patient {
  _id: string;
  firstName: string;
  lastName: string;
  patientId: string;
  email: string;
}

interface Supplier {
  _id: string;
  name: string;
  email: string;
  supplierCode: string;
}

export default function CommunicationsPage() {
  const [activeTab, setActiveTab] = useState<"patients" | "suppliers">("patients");
  const [recipients, setRecipients] = useState<string>("all");
  const [selectedPatients, setSelectedPatients] = useState<string[]>([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoadingPatients, setIsLoadingPatients] = useState(false);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [showPatientSelector, setShowPatientSelector] = useState(false);
  const [showSupplierSelector, setShowSupplierSelector] = useState(false);

  useEffect(() => {
    if (activeTab === "patients" && recipients === "selected") {
      fetchPatients();
    } else if (activeTab === "suppliers" && recipients === "selected") {
      fetchSuppliers();
    }
  }, [activeTab, recipients]);

  const fetchPatients = async () => {
    setIsLoadingPatients(true);
    try {
      const response = await fetch("/api/patients?limit=1000");
      const result = await response.json();
      if (result.success) {
        const patientsWithEmail = result.data.filter((p: Patient) => p.email);
        setPatients(patientsWithEmail);
      }
    } catch (error) {
      console.error("Failed to fetch patients:", error);
      toast.error("Failed to load patients");
    } finally {
      setIsLoadingPatients(false);
    }
  };

  const fetchSuppliers = async () => {
    setIsLoadingSuppliers(true);
    try {
      const response = await fetch("/api/suppliers?limit=1000");
      const result = await response.json();
      if (result.success) {
        const suppliersWithEmail = result.data.filter((s: Supplier) => s.email);
        setSuppliers(suppliersWithEmail);
      }
    } catch (error) {
      console.error("Failed to fetch suppliers:", error);
      toast.error("Failed to load suppliers");
    } finally {
      setIsLoadingSuppliers(false);
    }
  };

  const handleSendEmail = async () => {
    if (!subject.trim()) {
      toast.error("Please enter an email subject");
      return;
    }

    if (!message.trim()) {
      toast.error("Please enter an email message");
      return;
    }

    if (recipients === "selected") {
      const selectedList = activeTab === "patients" ? selectedPatients : selectedSuppliers;
      if (selectedList.length === 0) {
        toast.error(`Please select at least one ${activeTab === "patients" ? "patient" : "supplier"}`);
        return;
      }
    }

    setIsSending(true);
    try {
      const response = await fetch("/api/communications/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientType: activeTab,
          recipients: recipients === "all" ? "all" : activeTab === "patients" ? selectedPatients : selectedSuppliers,
          subject,
          message,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`Email sent successfully to ${result.count} recipient(s)`);
        // Reset form
        setSubject("");
        setMessage("");
        setSelectedPatients([]);
        setSelectedSuppliers([]);
        setRecipients("all");
      } else {
        toast.error(result.error || "Failed to send email");
      }
    } catch (error) {
      console.error("Failed to send email:", error);
      toast.error("Failed to send email");
    } finally {
      setIsSending(false);
    }
  };

  const togglePatientSelection = (patientId: string) => {
    setSelectedPatients((prev) =>
      prev.includes(patientId)
        ? prev.filter((id) => id !== patientId)
        : [...prev, patientId]
    );
  };

  const toggleSupplierSelection = (supplierId: string) => {
    setSelectedSuppliers((prev) =>
      prev.includes(supplierId)
        ? prev.filter((id) => id !== supplierId)
        : [...prev, supplierId]
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Communications</h2>
        <p className="text-muted-foreground">
          Send custom emails to patients and suppliers
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "patients" | "suppliers")}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="patients">
            <Users className="h-4 w-4 mr-2" />
            Patients
          </TabsTrigger>
          <TabsTrigger value="suppliers">
            <Building2 className="h-4 w-4 mr-2" />
            Suppliers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="patients" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Send Email to Patients</CardTitle>
              <CardDescription>
                Compose and send custom emails to your patients
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="patient-recipients">Recipients</Label>
                <Select value={recipients} onValueChange={setRecipients}>
                  <SelectTrigger id="patient-recipients">
                    <SelectValue placeholder="Select recipients" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Patients with Email</SelectItem>
                    <SelectItem value="selected">Selected Patients</SelectItem>
                  </SelectContent>
                </Select>
                {recipients === "selected" && (
                  <div className="mt-2">
                    <Dialog open={showPatientSelector} onOpenChange={setShowPatientSelector}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="w-full">
                          <Users className="h-4 w-4 mr-2" />
                          Select Patients ({selectedPatients.length} selected)
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[600px] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Select Patients</DialogTitle>
                          <DialogDescription>
                            Choose patients to send the email to
                          </DialogDescription>
                        </DialogHeader>
                        {isLoadingPatients ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {patients.map((patient) => (
                              <div
                                key={patient._id}
                                className="flex items-center space-x-2 p-2 hover:bg-accent rounded"
                              >
                                <Checkbox
                                  id={patient._id}
                                  checked={selectedPatients.includes(patient._id)}
                                  onCheckedChange={() => togglePatientSelection(patient._id)}
                                />
                                <label
                                  htmlFor={patient._id}
                                  className="flex-1 cursor-pointer"
                                >
                                  <p className="font-medium">
                                    {patient.firstName} {patient.lastName}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {patient.patientId} " {patient.email}
                                  </p>
                                </label>
                              </div>
                            ))}
                            {patients.length === 0 && (
                              <p className="text-center text-muted-foreground py-8">
                                No patients with email found
                              </p>
                            )}
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="patient-subject">Subject</Label>
                <Input
                  id="patient-subject"
                  placeholder="Email subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="patient-message">Message</Label>
                <Textarea
                  id="patient-message"
                  placeholder="Type your message here..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={10}
                />
              </div>

              <Button
                onClick={handleSendEmail}
                disabled={isSending}
                className="w-full"
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Email
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Send Email to Suppliers</CardTitle>
              <CardDescription>
                Compose and send custom emails to your suppliers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="supplier-recipients">Recipients</Label>
                <Select value={recipients} onValueChange={setRecipients}>
                  <SelectTrigger id="supplier-recipients">
                    <SelectValue placeholder="Select recipients" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Suppliers with Email</SelectItem>
                    <SelectItem value="selected">Selected Suppliers</SelectItem>
                  </SelectContent>
                </Select>
                {recipients === "selected" && (
                  <div className="mt-2">
                    <Dialog open={showSupplierSelector} onOpenChange={setShowSupplierSelector}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="w-full">
                          <Building2 className="h-4 w-4 mr-2" />
                          Select Suppliers ({selectedSuppliers.length} selected)
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[600px] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Select Suppliers</DialogTitle>
                          <DialogDescription>
                            Choose suppliers to send the email to
                          </DialogDescription>
                        </DialogHeader>
                        {isLoadingSuppliers ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {suppliers.map((supplier) => (
                              <div
                                key={supplier._id}
                                className="flex items-center space-x-2 p-2 hover:bg-accent rounded"
                              >
                                <Checkbox
                                  id={supplier._id}
                                  checked={selectedSuppliers.includes(supplier._id)}
                                  onCheckedChange={() => toggleSupplierSelection(supplier._id)}
                                />
                                <label
                                  htmlFor={supplier._id}
                                  className="flex-1 cursor-pointer"
                                >
                                  <p className="font-medium">{supplier.name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {supplier.supplierCode} " {supplier.email}
                                  </p>
                                </label>
                              </div>
                            ))}
                            {suppliers.length === 0 && (
                              <p className="text-center text-muted-foreground py-8">
                                No suppliers with email found
                              </p>
                            )}
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplier-subject">Subject</Label>
                <Input
                  id="supplier-subject"
                  placeholder="Email subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplier-message">Message</Label>
                <Textarea
                  id="supplier-message"
                  placeholder="Type your message here..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={10}
                />
              </div>

              <Button
                onClick={handleSendEmail}
                disabled={isSending}
                className="w-full"
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Email
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
