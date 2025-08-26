"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { z } from "zod";
import { validateFile } from "@/lib/security";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import FileUpload from "@/components/ui/FileUpload";
import Card from "@/components/ui/Card";
import { ArrowLeft, User, Phone, Mail, FileText, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";

const applicationSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  email: z.string().email("Please enter a valid email address"),
  // Business Permit specific fields
  businessName: z.string().optional(),
  businessType: z.string().optional(),
  businessAddress: z.string().optional(),
  businessRegistration: z.string().optional(),
  // Building Permit specific fields
  buildingType: z.string().optional(),
  buildingAddress: z.string().optional(),
  landOwnership: z.string().optional(),
  structuralCalculations: z.string().optional(),
  siteDevelopmentPlan: z.string().optional(),
  // Barangay Clearance specific fields
  purposeOfClearance: z.string().optional(),
  residencyAddress: z.string().optional(),
  communityTaxNumber: z.string().optional(),
});

type ApplicationForm = z.infer<typeof applicationSchema>;

export default function ApplyPage() {
  const { type } = useParams<{ type: string }>();
  const router = useRouter();
  
  const [formData, setFormData] = useState<ApplicationForm>({
    fullName: "",
    phone: "",
    email: "",
    businessName: "",
    businessType: "",
    businessAddress: "",
    businessRegistration: "",
    buildingType: "",
    buildingAddress: "",
    landOwnership: "",
    structuralCalculations: "",
    siteDevelopmentPlan: "",
    purposeOfClearance: "",
    residencyAddress: "",
    communityTaxNumber: "",
  });
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [errors, setErrors] = useState<Partial<ApplicationForm>>({});

  useEffect(() => {
    let mounted = true;
    async function check() {
      setChecking(true);
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      if (!data.user) {
        router.replace("/login");
      } else {
        setChecking(false);
      }
    }
    check();
    return () => { mounted = false; };
  }, [router]);

  const permitTypes = {
    business: {
      title: "Business Permit",
      description: "Apply for new or renewal of business permits",
      icon: "🏢",
      requirements: [
        "Business registration documents",
        "Valid government ID",
        "Business location details",
        "Tax clearance certificate",
      ],
    },
    building: {
      title: "Building Permit",
      description: "Apply for construction and renovation permits",
      icon: "🏗️",
      requirements: [
        "Building plans and specifications",
        "Land ownership documents",
        "Structural calculations",
        "Site development plan",
      ],
    },
    barangay: {
      title: "Barangay Clearance",
      description: "Request barangay clearance certificates",
      icon: "🏛️",
      requirements: [
        "Valid government ID",
        "Residency certificate",
        "Purpose of clearance",
        "Community tax certificate",
      ],
    },
  };

  const currentPermit = permitTypes[type as keyof typeof permitTypes];

  const handleInputChange = (field: keyof ApplicationForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    try {
      applicationSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Partial<ApplicationForm> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as keyof ApplicationForm] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error("Please fix the errors in the form");
      return;
    }

    setLoading(true);
    
    try {
      // 1) Create or update applicant
      const { data: applicant, error: applicantError } = await supabase
        .from("applicants")
        .upsert(
          { 
            full_name: formData.fullName, 
            phone: formData.phone, 
            email: formData.email 
          }, 
          { onConflict: "email" }
        )
        .select()
        .single();

      if (applicantError) throw applicantError;

      // 2) Create application
      const { data: application, error: applicationError } = await supabase
        .from("applications")
        .insert({ 
          applicant_id: applicant.id, 
          type, 
          status: "submitted", 
          fee_amount: 0 
        })
        .select()
        .single();

      if (applicationError) throw applicationError;

      // 3) Upload documents if any
      if (files.length > 0) {
        const uploadPromises = files.map(async (file) => {
          const path = `${application.id}/${Date.now()}-${file.name}`;
          
          const { error: uploadError } = await supabase.storage
            .from("documents")
            .upload(path, file, { cacheControl: "3600", upsert: false });
          
          if (uploadError) throw uploadError;

          const { error: docError } = await supabase
            .from("documents")
            .insert({ 
              application_id: application.id, 
              kind: "attachment", 
              file_path: path, 
              uploaded_by: "citizen" 
            });

          if (docError) throw docError;
        });

        await Promise.all(uploadPromises);
      }

      toast.success("Application submitted successfully!");
      router.push("/dashboard");
      
    } catch (error: any) {
      console.error("Application submission error:", error);
      toast.error(error.message || "Failed to submit application");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!currentPermit) {
  return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Invalid Permit Type</h1>
        <p className="text-gray-600 mb-6">The permit type you're looking for doesn't exist.</p>
        <Button onClick={() => router.push("/")}>Go Back Home</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          onClick={() => router.back()}
          leftIcon={<ArrowLeft className="h-4 w-4" />}
        >
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {currentPermit.icon} {currentPermit.title}
          </h1>
          <p className="text-gray-600 mt-1">{currentPermit.description}</p>
        </div>
          </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Requirements */}
        <div className="lg:col-span-1">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Requirements
            </h2>
            <ul className="space-y-3">
              {currentPermit.requirements.map((requirement, index) => (
                <li key={index} className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">{requirement}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* Application Form */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Application Details</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <Input
                label="Full Name"
                value={formData.fullName}
                onChange={(e) => handleInputChange("fullName", e.target.value)}
                placeholder="Enter your full name"
                error={errors.fullName}
                leftIcon={<User className="h-4 w-4" />}
                required
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Phone Number"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  placeholder="09xxxxxxxxx"
                  error={errors.phone}
                  leftIcon={<Phone className="h-4 w-4" />}
                  required
                />
                <Input
                  label="Email Address"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="you@email.com"
                  error={errors.email}
                  leftIcon={<Mail className="h-4 w-4" />}
                  required
                />
              </div>

              {/* Dynamic Fields Based on Permit Type */}
              {type === "business" && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Business Information</h3>
                  <Input
                    label="Business Name"
                    value={formData.businessName || ""}
                    onChange={(e) => handleInputChange("businessName", e.target.value)}
                    placeholder="Enter your business name"
                    leftIcon={<FileText className="h-4 w-4" />}
                  />
                  <Input
                    label="Business Type"
                    value={formData.businessType || ""}
                    onChange={(e) => handleInputChange("businessType", e.target.value)}
                    placeholder="e.g., Retail, Service, Manufacturing"
                    leftIcon={<FileText className="h-4 w-4" />}
                  />
                  <Input
                    label="Business Address"
                    value={formData.businessAddress || ""}
                    onChange={(e) => handleInputChange("businessAddress", e.target.value)}
                    placeholder="Complete business address"
                    leftIcon={<FileText className="h-4 w-4" />}
                  />
                  <Input
                    label="Business Registration Number"
                    value={formData.businessRegistration || ""}
                    onChange={(e) => handleInputChange("businessRegistration", e.target.value)}
                    placeholder="DTI/SEC registration number"
                    leftIcon={<FileText className="h-4 w-4" />}
                  />
                </div>
              )}

              {type === "building" && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Building Information</h3>
                  <Input
                    label="Building Type"
                    value={formData.buildingType || ""}
                    onChange={(e) => handleInputChange("buildingType", e.target.value)}
                    placeholder="e.g., Residential, Commercial, Industrial"
                    leftIcon={<FileText className="h-4 w-4" />}
                  />
                  <Input
                    label="Building Address"
                    value={formData.buildingAddress || ""}
                    onChange={(e) => handleInputChange("buildingAddress", e.target.value)}
                    placeholder="Complete building address"
                    leftIcon={<FileText className="h-4 w-4" />}
                  />
                  <Input
                    label="Land Ownership"
                    value={formData.landOwnership || ""}
                    onChange={(e) => handleInputChange("landOwnership", e.target.value)}
                    placeholder="e.g., Owned, Leased, Rented"
                    leftIcon={<FileText className="h-4 w-4" />}
                  />
                  <Input
                    label="Structural Calculations"
                    value={formData.structuralCalculations || ""}
                    onChange={(e) => handleInputChange("structuralCalculations", e.target.value)}
                    placeholder="Engineer's structural calculations details"
                    leftIcon={<FileText className="h-4 w-4" />}
                  />
                  <Input
                    label="Site Development Plan"
                    value={formData.siteDevelopmentPlan || ""}
                    onChange={(e) => handleInputChange("siteDevelopmentPlan", e.target.value)}
                    placeholder="Site development plan details"
                    leftIcon={<FileText className="h-4 w-4" />}
                  />
                </div>
              )}

              {type === "barangay" && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Clearance Information</h3>
                  <Input
                    label="Purpose of Clearance"
                    value={formData.purposeOfClearance || ""}
                    onChange={(e) => handleInputChange("purposeOfClearance", e.target.value)}
                    placeholder="e.g., Employment, Business, Travel, etc."
                    leftIcon={<FileText className="h-4 w-4" />}
                  />
                  <Input
                    label="Residency Address"
                    value={formData.residencyAddress || ""}
                    onChange={(e) => handleInputChange("residencyAddress", e.target.value)}
                    placeholder="Complete residency address"
                    leftIcon={<FileText className="h-4 w-4" />}
                  />
                  <Input
                    label="Community Tax Number"
                    value={formData.communityTaxNumber || ""}
                    onChange={(e) => handleInputChange("communityTaxNumber", e.target.value)}
                    placeholder="Community tax certificate number"
                    leftIcon={<FileText className="h-4 w-4" />}
                  />
            </div>
          )}

              <FileUpload
                files={files}
                onFilesChange={setFiles}
                maxFiles={5}
                maxSize={5 * 1024 * 1024} // 5MB
                accept={["image/*", "application/pdf"]}
                label="Supporting Documents"
                helperText="Upload relevant documents (images or PDFs). Max 5 files, 5MB each."
              />

              <div className="flex gap-4 pt-4">
                <Button 
                  type="submit" 
                  loading={loading}
                  className="flex-1"
                >
                  Submit Application
                </Button>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => router.push("/dashboard")}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        </div>
        </div>
    </div>
  );
}
