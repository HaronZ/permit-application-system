"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { z } from "zod";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";
import { useToast } from "@/components/ui/ToastProvider";

export default function ApplyPage() {
  const { type } = useParams<{ type: string }>();
  const router = useRouter();
  const { show } = useToast();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [checking, setChecking] = useState(true);

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

  const schema = useMemo(
    () =>
      z.object({
        fullName: z.string().min(2, "Enter your full name"),
        phone: z
          .string()
          .min(7, "Enter a valid phone")
          .regex(/^[0-9+\-()\s]+$/, "Phone can only contain digits and symbols"),
        email: z.string().email("Enter a valid email"),
      }),
    []
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});
    try {
      const parsed = schema.safeParse({ fullName, phone, email });
      if (!parsed.success) {
        const errs: Record<string, string> = {};
        for (const issue of parsed.error.issues) {
          if (issue.path[0]) errs[String(issue.path[0])] = issue.message;
        }
        setFieldErrors(errs);
        throw new Error("Please fix the highlighted fields.");
      }
      // 1) create applicant (upsert by email)
      const { data: applicant, error: aerr } = await supabase
        .from("applicants")
        .upsert({ full_name: fullName, phone, email }, { onConflict: "email" })
        .select()
        .single();
      if (aerr) throw aerr;

      // 2) create application
      const { data: app, error: apperr } = await supabase
        .from("applications")
        .insert({ applicant_id: applicant.id, type, status: "submitted", fee_amount: 0 })
        .select()
        .single();
      if (apperr) throw apperr;

      // 3) upload optional documents
      if (files.length > 0) {
        for (const f of files) {
          const path = `${app.id}/${Date.now()}-${f.name}`;
          const { error: uerr } = await supabase.storage
            .from("documents")
            .upload(path, f, { cacheControl: "3600", upsert: false });
          if (uerr) throw uerr;
          const { error: derr } = await supabase
            .from("documents")
            .insert({ application_id: app.id, kind: "attachment", file_path: path, uploaded_by: "citizen" });
          if (derr) throw derr;
        }
      }

      show({ type: "success", title: "Submitted", message: "Application submitted successfully." });
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      show({ type: "error", title: "Error", message: err.message || "Something went wrong" });
    } finally {
      setLoading(false);
    }
  }

  if (checking) return <div className="text-sm text-gray-600">Loading…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold capitalize">Apply: {String(type)}</h1>
        <p className="text-sm text-gray-600">Fill in your details and optionally attach a supporting photo.</p>
      </div>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" value={fullName} onChange={e => setFullName(e.target.value)} error={fieldErrors.fullName} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="09xxxxxxxxx" error={fieldErrors.phone} />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" error={fieldErrors.email} />
          </div>
        </div>
        <div>
          <Label htmlFor="files">Upload documents (photos)</Label>
          <input
            id="files"
            className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-gray-200 file:px-3 file:py-2 file:text-sm file:font-medium file:text-gray-900 hover:file:bg-gray-300"
            type="file"
            accept="image/*"
            multiple
            onChange={e => {
              const list = Array.from(e.target.files || []);
              // Simple validations: max 5 files, each <= 5MB
              const valid = list.filter(f => f.size <= 5 * 1024 * 1024 && f.type.startsWith("image/"));
              if (list.length > 5) {
                show({ type: "error", message: "You can upload up to 5 images." });
              }
              const dropped = list.filter(f => !valid.includes(f));
              if (dropped.length > 0) {
                show({ type: "error", message: "Some files were skipped (not an image or > 5MB)." });
              }
              setFiles(valid.slice(0, 5));
            }}
          />
          {files.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-3">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-2">
                  <img src={URL.createObjectURL(f)} className="h-16 w-16 rounded object-cover" alt={`file-${i}`} />
                  <span className="text-xs text-gray-600 max-w-[160px] truncate">{f.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" loading={loading}>Submit</Button>
          <Button type="button" variant="ghost" onClick={() => router.push("/dashboard")}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
