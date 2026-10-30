import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleSlash,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCog,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createUser, deleteUser, getUsers, updateUser, User } from "@/services/databaseService";
import { getSessionSnapshot, restoreSession, signUp } from "@/services/authService";
import { getCurrentUserRole, hasModuleAccess } from "@/utils/salesPermissionUtils";
import { cn } from "@/lib/utils";

type Role = "admin" | "manager" | "cashier" | "staff";
type StatusFilter = "all" | "active" | "inactive";

const PAGE_SIZE = 8;

interface RoleDefinition {
  id: Role;
  name: string;
  description: string;
  badgeClass: string;
}

const ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    id: "admin",
    name: "Administrator",
    description: "Full access to every module, including this register.",
    badgeClass: "border-amber-200 bg-amber-50 text-amber-700",
  },
  {
    id: "manager",
    name: "Manager",
    description: "Runs outlets, sales, purchasing and the staff register.",
    badgeClass: "border-indigo-200 bg-indigo-50 text-indigo-700",
  },
  {
    id: "cashier",
    name: "Cashier / Salesman",
    description: "Processes sales and handles customer transactions.",
    badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  {
    id: "staff",
    name: "Staff",
    description: "Limited access to inventory and supporting functions.",
    badgeClass: "border-slate-200 bg-slate-50 text-slate-700",
  },
];

interface StaffRecord {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  isActive: boolean;
  staffCode: string;
  position: string;
  department: string;
  phone: string;
  hireDate: string;
}

interface StaffForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  staffCode: string;
  position: string;
  department: string;
  hireDate: string;
  role: Role;
  isActive: boolean;
  password: string;
}

const emptyForm = (): StaffForm => ({
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  staffCode: "",
  position: "",
  department: "",
  hireDate: new Date().toISOString().slice(0, 10),
  role: "staff",
  isActive: true,
  password: "",
});

const roleDefinitionFor = (role: Role) => ROLE_DEFINITIONS.find((item) => item.id === role);

const displayName = (record: StaffRecord) =>
  `${record.firstName} ${record.lastName}`.trim() || record.email || "Unnamed staff";

const initialsFor = (record: StaffRecord) => {
  const initials = `${record.firstName.charAt(0)}${record.lastName.charAt(0)}`.trim();
  return (initials || record.email.charAt(0) || "?").toUpperCase();
};

const formatDate = (value: string) => {
  if (!value) return "—";
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const generatePassword = () => {
  const alphabet = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let password = "";
  for (let index = 0; index < 12; index += 1) {
    password += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }
  return password;
};

const toStaffRecord = (user: User): StaffRecord => {
  const hireDate = user.hire_date
    ? String(user.hire_date).slice(0, 10)
    : user.created_at
      ? new Date(user.created_at).toISOString().slice(0, 10)
      : "";

  return {
    id: user.id || "",
    username: user.username || "",
    email: user.email || "",
    firstName: user.first_name || "",
    lastName: user.last_name || "",
    role: (user.role as Role) || "staff",
    isActive: user.is_active !== false,
    staffCode: user.staff_code || "",
    position: user.position || "",
    department: user.department || "",
    phone: user.phone || "",
    hireDate,
  };
};

const Field = ({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) => (
  <div className="space-y-1.5">
    <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {label}
      {required && <span className="ml-0.5 text-destructive">*</span>}
    </Label>
    {children}
    {hint && <p className="text-[11px] leading-snug text-muted-foreground">{hint}</p>}
  </div>
);

const SectionHeading = ({ icon: Icon, title, hint }: { icon: typeof Users; title: string; hint?: string }) => (
  <div className="flex items-center gap-2 border-b pb-1.5">
    <Icon className="h-4 w-4 text-primary" />
    <h3 className="text-sm font-semibold">{title}</h3>
    {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
  </div>
);

export const EmployeeManagement = ({
  username,
  onBack,
  onLogout,
}: {
  username: string;
  onBack: () => void;
  onLogout: () => void;
}) => {
  const { toast } = useToast();
  const [access, setAccess] = useState<"checking" | "granted" | "denied">("checking");
  const [actorRole, setActorRole] = useState<string | null>(null);
  const [records, setRecords] = useState<StaffRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | Role>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<StaffRecord | null>(null);
  const [form, setForm] = useState<StaffForm>(emptyForm);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StaffRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const onBackRef = useRef(onBack);
  useEffect(() => {
    onBackRef.current = onBack;
  }, [onBack]);

  useEffect(() => {
    let cancelled = false;

    const checkAccess = async () => {
      const role = await getCurrentUserRole();
      if (cancelled) return;

      setActorRole(role);

      if (hasModuleAccess(role, "employees")) {
        setAccess("granted");
        return;
      }

      setAccess("denied");
      onBackRef.current();
    };

    checkAccess();

    return () => {
      cancelled = true;
    };
  }, []);

  const loadStaff = useCallback(async () => {
    setLoading(true);
    try {
      const users = await getUsers();
      setRecords(users.map(toStaffRecord));
    } catch (error) {
      console.error("Error loading staff register:", error);
      toast({
        title: "Could not load the staff register",
        description: "Check your connection and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (access === "granted") {
      loadStaff();
    }
  }, [access, loadStaff]);

  useEffect(() => {
    setPage(1);
  }, [search, roleFilter, statusFilter]);

  const isAdminActor = actorRole === "admin";
  const assignableRoles = isAdminActor
    ? ROLE_DEFINITIONS
    : ROLE_DEFINITIONS.filter((item) => item.id !== "admin");
  const currentUserEmail = (username || "").toLowerCase();

  const isSelf = useCallback(
    (record: StaffRecord) => !!currentUserEmail && record.email.toLowerCase() === currentUserEmail,
    [currentUserEmail]
  );

  const canManage = useCallback(
    (record: StaffRecord) => isAdminActor || record.role !== "admin",
    [isAdminActor]
  );

  const filteredRecords = useMemo(() => {
    const term = search.trim().toLowerCase();

    return records
      .filter((record) => {
        if (roleFilter !== "all" && record.role !== roleFilter) return false;
        if (statusFilter === "active" && !record.isActive) return false;
        if (statusFilter === "inactive" && record.isActive) return false;
        if (!term) return true;

        return [displayName(record), record.email, record.staffCode, record.position, record.department, record.username]
          .join(" ")
          .toLowerCase()
          .includes(term);
      })
      .sort((a, b) => displayName(a).localeCompare(displayName(b)));
  }, [records, search, roleFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filteredRecords.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const activeCount = records.filter((record) => record.isActive).length;
  const adminCount = records.filter((record) => record.role === "admin").length;

  const statCards = [
    { label: "Total staff", value: records.length, icon: Users, tone: "bg-blue-50 text-blue-600" },
    { label: "Active access", value: activeCount, icon: ShieldCheck, tone: "bg-emerald-50 text-emerald-600" },
    { label: "Inactive", value: records.length - activeCount, icon: CircleSlash, tone: "bg-slate-100 text-slate-500" },
    { label: "Administrators", value: adminCount, icon: UserCog, tone: "bg-amber-50 text-amber-600" },
  ];

  const hasActiveFilters = search.trim().length > 0 || roleFilter !== "all" || statusFilter !== "all";

  const clearFilters = () => {
    setSearch("");
    setRoleFilter("all");
    setStatusFilter("all");
  };

  const updateForm = (patch: Partial<StaffForm>) => setForm((current) => ({ ...current, ...patch }));

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setShowPassword(false);
    setFormOpen(true);
  };

  const openEdit = (record: StaffRecord) => {
    if (!canManage(record)) {
      toast({
        title: "Action not allowed",
        description: "Managers cannot edit administrator accounts.",
        variant: "destructive",
      });
      return;
    }

    setEditing(record);
    setShowPassword(false);
    setForm({
      firstName: record.firstName,
      lastName: record.lastName,
      email: record.email,
      phone: record.phone,
      staffCode: record.staffCode,
      position: record.position,
      department: record.department,
      hireDate: record.hireDate,
      role: record.role,
      isActive: record.isActive,
      password: "",
    });
    setFormOpen(true);
  };

  const buildUsername = (email: string) => {
    const base = email.split("@")[0].replace(/[^a-z0-9._-]/gi, "").toLowerCase() || "staff";
    let candidate = base;
    let suffix = 1;

    while (records.some((record) => record.username.toLowerCase() === candidate)) {
      suffix += 1;
      candidate = `${base}${suffix}`;
    }

    return candidate;
  };

  const validateForm = (): string | null => {
    if (!form.firstName.trim()) return "First name is required.";
    if (!form.lastName.trim()) return "Last name is required.";

    if (!editing) {
      const email = form.email.trim();
      if (!email) return "Email is required.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email address.";
      if (form.password.length < 6) return "Password must be at least 6 characters.";
      if (records.some((record) => record.email.toLowerCase() === email.toLowerCase())) {
        return "An account with this email already exists.";
      }
    }

    if (!isAdminActor && form.role === "admin") {
      return "Managers cannot assign the administrator role.";
    }

    if (editing && isSelf(editing) && !form.isActive) {
      return "You cannot deactivate your own access.";
    }

    const staffCode = form.staffCode.trim().toLowerCase();
    if (
      staffCode &&
      records.some(
        (record) => record.id !== editing?.id && record.staffCode.trim().toLowerCase() === staffCode
      )
    ) {
      return "That staff code is already in use.";
    }

    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      toast({ title: "Check the form", description: validationError, variant: "destructive" });
      return;
    }

    if (editing) {
      await saveExisting();
    } else {
      await createNew();
    }
  };

  const createNew = async () => {
    setSaving(true);
    const snapshot = await getSessionSnapshot();

    try {
      const email = form.email.trim().toLowerCase();
      const profile = {
        username: buildUsername(email),
        email,
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        role: form.role,
        is_active: form.isActive,
        staff_code: form.staffCode.trim() || null,
        position: form.position.trim() || null,
        department: form.department.trim() || null,
        phone: form.phone.trim() || null,
        hire_date: form.hireDate || null,
      };

      const result = (await signUp(email, form.password, profile)) as {
        user?: { id?: string; confirmed_at?: string | null } | null;
        error?: { message?: string };
      };

      // signUp() replaces the active session when confirmation is disabled, so the
      // administrator is restored before writing the staff record.
      await restoreSession(snapshot);

      if (result.error) {
        throw new Error(result.error.message || "Supabase rejected the new login.");
      }
      if (!result.user?.id) {
        throw new Error("The login was created but no user id was returned.");
      }

      const created = await createUser({ id: result.user.id, ...profile });
      if (!created) {
        throw new Error(
          "The login was created, but the staff record could not be saved. Run migration 20261030_add_staff_fields_to_users.sql and try again."
        );
      }

      setFormOpen(false);
      setEditing(null);
      await loadStaff();

      toast({
        title: "Staff member added",
        description: result.user.confirmed_at
          ? `${profile.first_name} ${profile.last_name} can now sign in.`
          : "A confirmation email was sent. They must confirm it before signing in.",
      });
    } catch (error) {
      console.error("Error creating staff member:", error);
      toast({
        title: "Could not add staff member",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      await restoreSession(snapshot);
      setSaving(false);
    }
  };

  const saveExisting = async () => {
    if (!editing) return;

    const name = displayName(editing);
    setSaving(true);

    try {
      const updated = await updateUser(editing.id, {
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        role: form.role,
        is_active: form.isActive,
        staff_code: form.staffCode.trim() || null,
        position: form.position.trim() || null,
        department: form.department.trim() || null,
        phone: form.phone.trim() || null,
        hire_date: form.hireDate || null,
      });

      if (!updated) {
        throw new Error(
          "The staff record could not be updated. Run migration 20261030_add_staff_fields_to_users.sql and try again."
        );
      }

      setFormOpen(false);
      setEditing(null);
      await loadStaff();
      toast({ title: "Staff member updated", description: `${name} has been saved.` });
    } catch (error) {
      console.error("Error updating staff member:", error);
      toast({
        title: "Could not update staff member",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (record: StaffRecord) => {
    if (isSelf(record)) {
      toast({
        title: "Action not allowed",
        description: "You cannot change your own access status.",
        variant: "destructive",
      });
      return;
    }
    if (!canManage(record)) {
      toast({
        title: "Action not allowed",
        description: "Managers cannot change administrator accounts.",
        variant: "destructive",
      });
      return;
    }

    const name = displayName(record);
    setBusyId(record.id);

    try {
      const updated = await updateUser(record.id, { is_active: !record.isActive });
      if (!updated) {
        throw new Error("Supabase rejected the update.");
      }

      await loadStaff();
      toast({
        title: record.isActive ? "Access deactivated" : "Access activated",
        description: `${name} is now ${record.isActive ? "inactive" : "active"}.`,
      });
    } catch (error) {
      console.error("Error updating access status:", error);
      toast({
        title: "Could not update access",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    if (isSelf(deleteTarget) || !canManage(deleteTarget)) {
      toast({
        title: "Action not allowed",
        description: "This account cannot be deleted by you.",
        variant: "destructive",
      });
      setDeleteTarget(null);
      return;
    }

    const name = displayName(deleteTarget);
    const id = deleteTarget.id;
    setDeleting(true);

    try {
      const removed = await deleteUser(id);
      if (!removed) {
        throw new Error("Supabase rejected the delete request.");
      }

      setRecords((current) => current.filter((record) => record.id !== id));
      setDeleteTarget(null);
      toast({ title: "Staff record deleted", description: `${name} was removed from the register.` });
    } catch (error) {
      console.error("Error deleting staff record:", error);
      toast({
        title: "Could not delete staff record",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  if (access === "checking") {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-64 animate-pulse rounded-md bg-muted" />
          <div className="h-4 w-80 animate-pulse rounded-md bg-muted" />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-20 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
        <div className="h-96 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (access === "denied") {
    return (
      <div className="mx-auto w-full max-w-lg py-16">
        <Card className="border-border/60 shadow-sm">
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <ShieldAlert className="h-6 w-6 text-destructive" />
            </span>
            <h2 className="text-lg font-semibold">Employee management is restricted</h2>
            <p className="text-sm text-muted-foreground">
              Only administrators and managers can open the staff register. Ask an administrator to review
              your role.
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
              <Button variant="outline" onClick={onBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to dashboard
              </Button>
              <Button variant="ghost" onClick={onLogout}>
                Sign out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedRole = roleDefinitionFor(form.role);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="mt-0.5 shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Employee Management</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Staff register, login roles and access status for your team.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => loadStaff()} disabled={loading}>
            <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button size="sm" onClick={openCreate}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add staff member
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statCards.map(({ label, value, icon: Icon, tone }) => (
          <Card key={label} className="border-border/60 shadow-sm">
            <CardContent className="flex items-center gap-3 p-4">
              <span className={cn("flex h-10 w-10 items-center justify-center rounded-lg", tone)}>
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {label}
                </p>
                <p className="text-xl font-semibold leading-tight">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Register */}
      <Card className="overflow-hidden border-border/60 shadow-sm">
        <div className="flex flex-col gap-3 border-b bg-muted/30 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, staff code, email or position"
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as "all" | Role)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {ROLE_DEFINITIONS.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Any status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="mr-1 h-3.5 w-3.5" />
                Clear
              </Button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20 hover:bg-muted/20">
                <TableHead>Employee</TableHead>
                <TableHead>Staff code</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Hire date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={`skeleton-${index}`}>
                    <TableCell colSpan={7}>
                      <div className="h-10 animate-pulse rounded-md bg-muted/60" />
                    </TableCell>
                  </TableRow>
                ))
              ) : pageRows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7}>
                    <div className="flex flex-col items-center gap-2 py-12 text-center">
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                        <Users className="h-6 w-6 text-muted-foreground" />
                      </span>
                      <h3 className="text-sm font-semibold">
                        {records.length === 0 ? "No staff registered yet" : "No staff match these filters"}
                      </h3>
                      <p className="max-w-sm text-sm text-muted-foreground">
                        {records.length === 0
                          ? "Add your first staff member to create their login and staff record."
                          : "Adjust the search text, role or status filters to widen the results."}
                      </p>
                      {records.length === 0 ? (
                        <Button size="sm" className="mt-2" onClick={openCreate}>
                          <Plus className="mr-2 h-4 w-4" />
                          Add staff member
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" className="mt-2" onClick={clearFilters}>
                          Clear filters
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                pageRows.map((record) => {
                  const role = roleDefinitionFor(record.role);
                  const self = isSelf(record);
                  const manageable = canManage(record);

                  return (
                    <TableRow key={record.id} className="hover:bg-muted/40">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border">
                            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                              {initialsFor(record)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="truncate font-medium">{displayName(record)}</span>
                              {self && (
                                <Badge variant="outline" className="border-primary/30 text-[10px] text-primary">
                                  You
                                </Badge>
                              )}
                            </div>
                            <span className="block truncate text-xs text-muted-foreground">
                              {record.email || "No email on file"}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {record.staffCode || "—"}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{record.position || "—"}</div>
                        {record.department && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Briefcase className="h-3 w-3" />
                            {record.department}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("border", role?.badgeClass)}>
                          {role?.name || record.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
                            record.isActive
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          )}
                        >
                          <span
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              record.isActive ? "bg-emerald-500" : "bg-slate-400"
                            )}
                          />
                          {record.isActive ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {formatDate(record.hireDate)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground">
                              {displayName(record)}
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem disabled={!manageable} onClick={() => openEdit(record)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={!manageable || self || busyId === record.id}
                              onClick={() => toggleStatus(record)}
                            >
                              {record.isActive ? (
                                <>
                                  <CircleSlash className="mr-2 h-4 w-4" />
                                  Deactivate access
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="mr-2 h-4 w-4" />
                                  Activate access
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              disabled={!manageable || self}
                              onClick={() => setDeleteTarget(record)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete record
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-2 border-t px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>
            {filteredRecords.length === 0
              ? "No staff to show"
              : `Showing ${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(
                  safePage * PAGE_SIZE,
                  filteredRecords.length
                )} of ${filteredRecords.length}`}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={safePage <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="tabular-nums">
              Page {safePage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={safePage >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Create / edit dialog */}
      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) {
            setEditing(null);
            setShowPassword(false);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit staff member" : "Add staff member"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Update the staff profile. The login email and password are managed by authentication."
                : "Creates a login account and a matching staff record in one step."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-2">
            <section className="space-y-3">
              <SectionHeading icon={Users} title="Personal details" />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="First name" required>
                  <Input
                    value={form.firstName}
                    onChange={(event) => updateForm({ firstName: event.target.value })}
                    placeholder="Amina"
                  />
                </Field>
                <Field label="Last name" required>
                  <Input
                    value={form.lastName}
                    onChange={(event) => updateForm({ lastName: event.target.value })}
                    placeholder="Yusuf"
                  />
                </Field>
                <Field
                  label="Login email"
                  required={!editing}
                  hint={editing ? "Login email is owned by authentication and cannot be changed here." : undefined}
                >
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(event) => updateForm({ email: event.target.value })}
                    placeholder="amina@business.com"
                    disabled={!!editing}
                    className={cn(editing && "bg-muted text-muted-foreground")}
                  />
                </Field>
                <Field label="Phone">
                  <Input
                    value={form.phone}
                    onChange={(event) => updateForm({ phone: event.target.value })}
                    placeholder="+254 700 000 000"
                  />
                </Field>
              </div>
            </section>

            <section className="space-y-3">
              <SectionHeading icon={Briefcase} title="Employment" hint="Shown in the staff register" />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Staff code" hint="Optional, must be unique.">
                  <Input
                    value={form.staffCode}
                    onChange={(event) => updateForm({ staffCode: event.target.value })}
                    placeholder="EMP-014"
                    className="font-mono"
                  />
                </Field>
                <Field label="Position">
                  <Input
                    value={form.position}
                    onChange={(event) => updateForm({ position: event.target.value })}
                    placeholder="Sales supervisor"
                  />
                </Field>
                <Field label="Department">
                  <Input
                    value={form.department}
                    onChange={(event) => updateForm({ department: event.target.value })}
                    placeholder="Retail operations"
                  />
                </Field>
                <Field label="Hire date">
                  <Input
                    type="date"
                    value={form.hireDate}
                    onChange={(event) => updateForm({ hireDate: event.target.value })}
                  />
                </Field>
              </div>
            </section>

            <section className="space-y-3">
              <SectionHeading icon={UserCog} title="Access" hint="Role and login status" />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Role" hint={selectedRole?.description}>
                  <Select value={form.role} onValueChange={(value) => updateForm({ role: value as Role })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {assignableRoles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Access status" hint="Inactive staff keep their record but cannot work in the system.">
                  <Select
                    value={form.isActive ? "active" : "inactive"}
                    onValueChange={(value) => updateForm({ isActive: value === "active" })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                {!editing && (
                  <Field
                    label="Temporary password"
                    required
                    hint="Share it securely. The employee can change it after signing in."
                  >
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          type={showPassword ? "text" : "password"}
                          value={form.password}
                          onChange={(event) => updateForm({ password: event.target.value })}
                          placeholder="Minimum 6 characters"
                          className="pr-9"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((current) => !current)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="shrink-0"
                        onClick={() => {
                          updateForm({ password: generatePassword() });
                          setShowPassword(true);
                        }}
                      >
                        <KeyRound className="mr-1.5 h-4 w-4" />
                        Generate
                      </Button>
                    </div>
                  </Field>
                )}
              </div>
            </section>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {editing ? "Saving…" : "Creating…"}
                </>
              ) : editing ? (
                "Save changes"
              ) : (
                "Create staff member"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              Delete staff record?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <>
                  <span className="font-medium text-foreground">{displayName(deleteTarget)}</span> will be
                  removed from the staff register along with their role and access status. The login
                  identity in Supabase authentication is not deleted by this action — deactivate the
                  account instead if you want to keep history.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                handleDelete();
              }}
            >
              {deleting ? "Deleting…" : "Delete record"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
