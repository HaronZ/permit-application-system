import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { json, error, readJson } from "@/lib/http";
import { z } from "zod";
import { monitoring } from "@/lib/monitoring";

// Validation schemas
const applicationSchema = z.object({
  full_name: z.string().min(2, "Full name must be at least 2 characters"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  email: z.string().email("Invalid email address"),
  type: z.enum(["business", "building", "barangay"]),
  fee_amount: z.number().min(0).optional(),
});

// GET /api/applications?email=...
export async function GET(req: NextRequest) {
  const startTime = Date.now();
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");

    const query = supabaseAdmin
      .from("applications")
      .select(`
        id, type, status, created_at, applicant_id, reference_no, fee_amount,
        applicant:applicants(full_name, email, phone)
      `)
      .order("created_at", { ascending: false });

    let data;
    if (email) {
      const { data: applicant, error: applicantError } = await supabaseAdmin
        .from("applicants")
        .select("id")
        .eq("email", email)
        .single();

      if (applicantError || !applicant) {
        const duration = Date.now() - startTime;
        monitoring.apiCall('/api/applications', duration, 200);
        return json({ applications: [] });
      }

      const { data: apps, error: appsError } = await query.eq("applicant_id", applicant.id);
      if (appsError) throw appsError;
      data = apps || [];
    } else {
      const { data: apps, error: appsError } = await query;
      if (appsError) throw appsError;
      data = apps || [];
    }

    const duration = Date.now() - startTime;
    monitoring.apiCall('/api/applications', duration, 200);

    return json({ 
      applications: data,
      count: data.length,
      success: true 
    });
  } catch (err: any) {
    const duration = Date.now() - startTime;
    monitoring.apiCall('/api/applications', duration, 500);
    console.error("GET /api/applications error:", err);
    return error("Failed to fetch applications", 500);
  }
}

// POST /api/applications
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await readJson<any>(req);
    
    // Validate request body
    const validation = applicationSchema.safeParse(body);
    if (!validation.success) {
      const duration = Date.now() - startTime;
      monitoring.apiCall('/api/applications', duration, 422);
      return error("Invalid request data: " + validation.error.errors[0].message, 422);
    }

    const { full_name, phone, email, type, fee_amount } = validation.data;

    // Create or update applicant
    const { data: applicant, error: applicantError } = await supabaseAdmin
      .from("applicants")
      .upsert(
        { 
          full_name, 
          phone, 
          email 
        }, 
        { onConflict: "email" }
      )
      .select("id")
      .single();

    if (applicantError) {
      const duration = Date.now() - startTime;
      monitoring.apiCall('/api/applications', duration, 500);
      console.error("Applicant creation error:", applicantError);
      return error("Failed to create applicant", 500);
    }

    // Create application
    const { data: application, error: applicationError } = await supabaseAdmin
      .from("applications")
      .insert({ 
        applicant_id: applicant.id, 
        type, 
        status: "submitted", 
        fee_amount: fee_amount || 0 
      })
      .select("id, reference_no")
      .single();

    if (applicationError) {
      const duration = Date.now() - startTime;
      monitoring.apiCall('/api/applications', duration, 500);
      console.error("Application creation error:", applicationError);
      return error("Failed to create application", 500);
    }

    const duration = Date.now() - startTime;
    monitoring.apiCall('/api/applications', duration, 201);

    return json({ 
      id: application.id, 
      reference_no: application.reference_no,
      success: true,
      message: "Application created successfully"
    });
  } catch (err: any) {
    const duration = Date.now() - startTime;
    monitoring.apiCall('/api/applications', duration, 500);
    console.error("POST /api/applications error:", err);
    return error("Failed to create application", 500);
  }
}
