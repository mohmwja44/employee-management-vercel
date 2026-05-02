import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Save, X, Edit2, UserPlus, Archive, Calendar, Trash2, ArrowLeft, Settings, Menu, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";

const DAYS = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const SHIFT_TYPES = ["Late", "Opening", "Mid", "OFF"];

const SHIFT_COLORS: Record<string, string> = {
  Late: "bg-blue-100 text-blue-800",
  Opening: "bg-orange-100 text-orange-800",
  Mid: "bg-purple-100 text-purple-800",
  OFF: "bg-yellow-100 text-yellow-800",
};

interface AdminPanelProps {
  currentEmployee?: {
    id: number;
    ibsId: string;
    name: string;
    isAdmin: number;
  };
}

export default function AdminPanel({ currentEmployee }: AdminPanelProps) {
  const isSuperAdmin = currentEmployee?.isAdmin === 1 || currentEmployee?.ibsId === "000000";
  const [editingEmployeeId, setEditingEmployeeId] = useState<number | null>(null);
  const [editingShifts, setEditingShifts] = useState<Record<string, string>>({});
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [deletingEmployeeId, setDeletingEmployeeId] = useState<number | null>(null);
  const [deletingEmployeeName, setDeletingEmployeeName] = useState("");
  
  const [newIbsId, setNewIbsId] = useState("");
  const [newName, setNewName] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [archivedData, setArchivedData] = useState<any[]>([]);
  const [viewingArchiveWeek, setViewingArchiveWeek] = useState<string | null>(null);

  const shiftsQuery = trpc.shifts.getAll.useQuery();
  const submitShiftMutation = trpc.shifts.submit.useMutation();
  const addEmployeeMutation = trpc.employees.add.useMutation();
  const deleteEmployeeMutation = trpc.employees.delete.useMutation();
  const archiveWeekMutation = trpc.shifts.archiveWeek.useMutation();
  const resetAllShiftsMutation = trpc.shifts.resetAll.useMutation();
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  
  const getArchivedByMonthQuery = trpc.shifts.getArchivedByMonth.useQuery(
    { year: selectedYear, month: selectedMonth },
    { enabled: isSuperAdmin }
  );

  const systemStatusQuery = trpc.system.isOpen.useQuery();
  const toggleOpenMutation = trpc.system.toggleOpen.useMutation({
    onSuccess: () => {
      systemStatusQuery.refetch();
      toast.success("Shift entry status updated");
    },
  });

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      shiftsQuery.refetch();
    }, 5000);

    return () => clearInterval(interval);
  }, [autoRefresh, shiftsQuery]);

  useEffect(() => {
    if (getArchivedByMonthQuery.data) {
      setArchivedData(Array.isArray(getArchivedByMonthQuery.data) ? getArchivedByMonthQuery.data : []);
    }
  }, [getArchivedByMonthQuery.data]);

  const handleEditClick = (employeeId: number, shift: any) => {
    setEditingEmployeeId(employeeId);
    setEditingShifts({
      Saturday: shift?.saturday || "OFF",
      Sunday: shift?.sunday || "OFF",
      Monday: shift?.monday || "OFF",
      Tuesday: shift?.tuesday || "OFF",
      Wednesday: shift?.wednesday || "OFF",
      Thursday: shift?.thursday || "OFF",
      Friday: shift?.friday || "OFF",
    });
  };

  const handleShiftChange = (day: string, value: string) => {
    setEditingShifts(prev => ({
      ...prev,
      [day]: value,
    }));
  };

  const handleSave = async (employeeId: number) => {
    try {
      await submitShiftMutation.mutateAsync({
        employeeId,
        saturday: editingShifts.Saturday,
        sunday: editingShifts.Sunday,
        monday: editingShifts.Monday,
        tuesday: editingShifts.Tuesday,
        wednesday: editingShifts.Wednesday,
        thursday: editingShifts.Thursday,
        friday: editingShifts.Friday,
      });
      setEditingEmployeeId(null);
      shiftsQuery.refetch();
      toast.success("Shift updated successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update shift");
    }
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIbsId || !newName) {
      toast.error("Please enter both IBS ID and Name");
      return;
    }
    
    try {
      setIsAdding(true);
      await addEmployeeMutation.mutateAsync({
        ibsId: newIbsId,
        name: newName,
      });
      setNewIbsId("");
      setNewName("");
      shiftsQuery.refetch();
      toast.success("Employee added successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to add employee");
    } finally {
      setIsAdding(false);
    }
  };

  const handleArchiveWeek = async () => {
    try {
      const now = new Date();
      const weekStartDate = new Date(now);
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 6 ? 0 : - (day + 1));
      weekStartDate.setDate(diff);
      weekStartDate.setHours(0, 0, 0, 0);
      
      await archiveWeekMutation.mutateAsync({
        weekStartDate,
        adminId: currentEmployee?.ibsId || "000000",
      });
      
      toast.success("Weekly shifts archived successfully");
      shiftsQuery.refetch();
      getArchivedByMonthQuery.refetch();
    } catch (err) {
      console.error(err);
      toast.error("Failed to archive shifts");
    }
  };

  const handleCancel = () => {
    setEditingEmployeeId(null);
    setEditingShifts({});
  };

  const handleResetAll = async () => {
    try {
      await resetAllShiftsMutation.mutateAsync();
      toast.success("All shifts have been reset to OFF");
      shiftsQuery.refetch();
      setIsResetDialogOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to reset shifts");
    }
  };

  const handleDeleteClick = (employeeId: number, employeeName: string) => {
    setDeletingEmployeeId(employeeId);
    setDeletingEmployeeName(employeeName);
  };

  const handleConfirmDelete = async () => {
    if (deletingEmployeeId === null) return;
    
    try {
      await deleteEmployeeMutation.mutateAsync({
        id: deletingEmployeeId,
      });
      setDeletingEmployeeId(null);
      setDeletingEmployeeName("");
      shiftsQuery.refetch();
      toast.success(`${deletingEmployeeName} has been deleted successfully`);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to delete employee");
    }
  };

  if (shiftsQuery.isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const employeesWithShifts = (Array.isArray(shiftsQuery.data) ? shiftsQuery.data : [])
    .filter(({ employee }) => employee && employee.isAdmin !== 1)
    .sort((a, b) => Number(a.employee.ibsId) - Number(b.employee.ibsId));

  // Archive details view
  if (viewingArchiveWeek) {
    const weekData = archivedData.filter(a => new Date(a.weekStartDate).toISOString() === viewingArchiveWeek);
    const archivedDate = weekData.length > 0 ? new Date(weekData[0].archivedAt).toLocaleDateString() : new Date(viewingArchiveWeek).toLocaleDateString();
    
    return (
      <div className="space-y-4 p-2 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
          <Button variant="outline" size="sm" onClick={() => setViewingArchiveWeek(null)} className="w-full md:w-auto">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Archives
          </Button>
          <h2 className="text-lg md:text-xl font-bold">
            Archive for Week: {archivedDate}
          </h2>
        </div>
        
        <Card className="w-full">
          <CardContent className="pt-4 md:pt-6 px-2 md:px-6">
            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {weekData.map((record: any) => (
                <div key={record.id} className="border rounded-lg p-4 bg-gradient-to-br from-blue-50 to-indigo-50">
                  <div className="mb-3 pb-3 border-b">
                    <p className="font-bold text-base text-gray-900">{record.name}</p>
                    <p className="text-xs text-gray-500">ID: {record.ibsId}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {DAYS.map(day => {
                      const val = record[day.toLowerCase()] || "OFF";
                      return (
                        <div key={day} className="flex flex-col">
                          <span className="text-xs font-semibold text-gray-600 mb-1">{day.slice(0, 3)}</span>
                          <Badge className={`${SHIFT_COLORS[val] || "bg-gray-100 text-gray-800"} text-xs justify-center`}>
                            {val}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-blue-50 to-indigo-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Employee</th>
                    {DAYS.map(day => (
                      <th key={day} className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{day}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {weekData.map((record: any) => (
                    <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <div className="flex flex-col">
                          <span className="font-bold">{record.name}</span>
                          <span className="text-xs text-gray-500">{record.ibsId}</span>
                        </div>
                      </td>
                      {DAYS.map(day => {
                        const val = record[day.toLowerCase()] || "OFF";
                        return (
                          <td key={day} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <Badge className={SHIFT_COLORS[val] || "bg-gray-100 text-gray-800"}>
                              {val}
                            </Badge>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-2 md:p-6 md:space-y-6">
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deletingEmployeeId !== null} onOpenChange={(open) => {
        if (!open) {
          setDeletingEmployeeId(null);
          setDeletingEmployeeName("");
        }
      }}>
        <AlertDialogContent className="mx-4">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete <strong>{deletingEmployeeName}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-4 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteEmployeeMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Reset Confirmation Dialog */}
      <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <AlertDialogContent className="mx-4">
          <AlertDialogHeader>
            <AlertDialogTitle>Reset All Shifts</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reset all employee shifts to <strong>OFF</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-4 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleResetAll}
              className="bg-red-600 hover:bg-red-700"
            >
              {resetAllShiftsMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Reset Everything"
              )}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <Tabs defaultValue="manage" className="w-full">
        <TabsList className={`grid w-full ${isSuperAdmin ? 'grid-cols-3' : 'grid-cols-2'} mb-4`}>
          <TabsTrigger value="manage" className="gap-1 md:gap-2 text-xs md:text-sm">
            <Edit2 className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Manage</span>
          </TabsTrigger>
          <TabsTrigger value="archive" className="gap-1 md:gap-2 text-xs md:text-sm">
            <Archive className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Archive</span>
          </TabsTrigger>
          {isSuperAdmin && (
            <TabsTrigger value="settings" className="gap-1 md:gap-2 text-xs md:text-sm">
              <Settings className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="manage" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3 md:pb-6">
              <CardTitle className="text-lg md:text-2xl">Manage Employee Shifts</CardTitle>
              <CardDescription className="text-xs md:text-sm">Edit and assign shifts to employees.</CardDescription>
            </CardHeader>
            <CardContent className="px-2 md:px-6">
              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {employeesWithShifts.map(({ employee, shift }) => (
                  <div key={employee.id} className="border rounded-lg p-4 bg-gradient-to-br from-green-50 to-emerald-50">
                    {editingEmployeeId === employee.id ? (
                      <>
                        <div className="mb-3 pb-3 border-b">
                          <p className="font-bold text-base text-gray-900">{employee.name}</p>
                          <p className="text-xs text-gray-500">ID: {employee.ibsId}</p>
                        </div>
                        <div className="space-y-2">
                          {DAYS.map(day => (
                            <div key={day} className="flex items-center justify-between">
                              <label className="text-xs font-semibold text-gray-600">{day}</label>
                              <select
                                value={editingShifts[day] || "OFF"}
                                onChange={(e) => handleShiftChange(day, e.target.value)}
                                className="text-xs border rounded px-2 py-1 bg-white"
                              >
                                {SHIFT_TYPES.map(type => (
                                  <option key={type} value={type}>{type}</option>
                                ))}
                              </select>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Button
                            size="sm"
                            onClick={() => handleSave(employee.id)}
                            disabled={submitShiftMutation.isPending}
                            className="flex-1 text-xs"
                          >
                            {submitShiftMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancel}
                            className="flex-1 text-xs"
                          >
                            <X className="h-3 w-3 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="mb-3 pb-3 border-b">
                          <p className="font-bold text-base text-gray-900">{employee.name}</p>
                          <p className="text-xs text-gray-500">ID: {employee.ibsId}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          {DAYS.map(day => {
                            const val = shift?.[day.toLowerCase()] || "OFF";
                            return (
                              <div key={day} className="flex flex-col">
                                <span className="text-xs font-semibold text-gray-600 mb-1">{day.slice(0, 3)}</span>
                                <Badge className={`${SHIFT_COLORS[val] || "bg-gray-100 text-gray-800"} text-xs justify-center`}>
                                  {val}
                                </Badge>
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditClick(employee.id, shift)}
                            className="flex-1 text-xs"
                          >
                            <Edit2 className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteClick(employee.id, employee.name)}
                            className="flex-1 text-xs"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-green-50 to-emerald-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Employee</th>
                      {DAYS.map(day => (
                        <th key={day} className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          {day}
                        </th>
                      ))}
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {employeesWithShifts.map(({ employee, shift }) => (
                      <tr key={employee.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          <div className="flex flex-col">
                            <span className="font-bold">{employee.name}</span>
                            <span className="text-xs text-gray-500">{employee.ibsId}</span>
                          </div>
                        </td>
                        {editingEmployeeId === employee.id ? (
                          <>
                            {DAYS.map(day => (
                              <td key={day} className="px-6 py-4 whitespace-nowrap text-sm">
                                <select
                                  value={editingShifts[day] || "OFF"}
                                  onChange={(e) => handleShiftChange(day, e.target.value)}
                                  className="border rounded px-2 py-1 text-sm bg-white"
                                >
                                  {SHIFT_TYPES.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                  ))}
                                </select>
                              </td>
                            ))}
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                              <Button
                                size="sm"
                                onClick={() => handleSave(employee.id)}
                                disabled={submitShiftMutation.isPending}
                              >
                                {submitShiftMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancel}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </td>
                          </>
                        ) : (
                          <>
                            {DAYS.map(day => {
                              const val = shift?.[day.toLowerCase()] || "OFF";
                              return (
                                <td key={day} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  <Badge className={SHIFT_COLORS[val] || "bg-gray-100 text-gray-800"}>
                                    {val}
                                  </Badge>
                                </td>
                              );
                            })}
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditClick(employee.id, shift)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteClick(employee.id, employee.name)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 md:pb-6">
              <CardTitle className="text-lg md:text-2xl">Archive Weekly Shifts</CardTitle>
              <CardDescription className="text-xs md:text-sm">Save the current week's shifts to archive.</CardDescription>
            </CardHeader>
            <CardContent className="px-2 md:px-6">
              <Button 
                onClick={handleArchiveWeek}
                disabled={archiveWeekMutation.isPending}
                className="w-full md:w-auto gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                {archiveWeekMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Archive className="h-4 w-4" />
                )}
                Archive This Week
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 md:pb-6">
              <CardTitle className="text-lg md:text-2xl">Add New Employee</CardTitle>
              <CardDescription className="text-xs md:text-sm">Add a new employee to the system.</CardDescription>
            </CardHeader>
            <CardContent className="px-2 md:px-6">
              <form onSubmit={handleAddEmployee} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ibsId" className="text-xs md:text-sm">IBS ID</Label>
                    <Input
                      id="ibsId"
                      placeholder="Enter IBS ID"
                      value={newIbsId}
                      onChange={(e) => setNewIbsId(e.target.value)}
                      required
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-xs md:text-sm">Name</Label>
                    <Input
                      id="name"
                      placeholder="Enter Employee Name"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      required
                      className="text-sm"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full md:w-auto gap-2" disabled={isAdding}>
                  {isAdding ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="h-4 w-4" />
                  )}
                  Add Employee
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="archive" className="mt-4">
          <Card>
            <CardHeader className="pb-3 md:pb-6">
              <CardTitle className="text-lg md:text-2xl">Archived Shifts</CardTitle>
              <CardDescription className="text-xs md:text-sm">View historical shift data.</CardDescription>
            </CardHeader>
            <CardContent className="px-2 md:px-6">
              <div className="flex flex-col md:flex-row gap-3 md:gap-4 mb-4">
                <div className="flex-1">
                  <Label className="text-xs md:text-sm">Month</Label>
                  <Select
                    value={selectedMonth.toString()}
                    onValueChange={(value) => setSelectedMonth(parseInt(value))}
                  >
                    <SelectTrigger className="text-xs md:text-sm">
                      <SelectValue placeholder="Select Month" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }).map((_, i) => (
                        <SelectItem key={i} value={i.toString()}>
                          {new Date(0, i).toLocaleString('default', { month: 'long' })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label className="text-xs md:text-sm">Year</Label>
                  <Select
                    value={selectedYear.toString()}
                    onValueChange={(value) => setSelectedYear(parseInt(value))}
                  >
                    <SelectTrigger className="text-xs md:text-sm">
                      <SelectValue placeholder="Select Year" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 5 }).map((_, i) => {
                        const year = new Date().getFullYear() - i;
                        return (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {Object.entries(
                  archivedData.reduce((acc: any, curr: any) => {
                    const date = new Date(curr.weekStartDate).toISOString();
                    if (!acc[date]) acc[date] = 0;
                    acc[date]++;
                    return acc;
                  }, {})
                ).length > 0 ? (
                  Object.entries(
                    archivedData.reduce((acc: any, curr: any) => {
                      const date = new Date(curr.weekStartDate).toISOString();
                      if (!acc[date]) acc[date] = 0;
                      acc[date]++;
                      return acc;
                    }, {})
                  ).map(([weekDate, count]: [string, any]) => (
                    <div key={weekDate} className="border rounded-lg p-4 bg-gradient-to-br from-purple-50 to-pink-50">
                      <p className="font-bold text-gray-900 mb-2">{new Date(weekDate).toLocaleDateString()}</p>
                      <p className="text-xs text-gray-600 mb-3">{count} employees</p>
                      <Button 
                        size="sm"
                        variant="outline"
                        className="w-full gap-1 text-xs"
                        onClick={() => setViewingArchiveWeek(weekDate)}
                      >
                        <Calendar className="h-3 w-3" />
                        View Details
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    No archived data for this month.
                  </div>
                )}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-purple-50 to-pink-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Week Start Date</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Records</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Object.keys(
                      archivedData.reduce((acc: any, curr: any) => {
                        const date = new Date(curr.weekStartDate).toISOString();
                        if (!acc[date]) acc[date] = 0;
                        acc[date]++;
                        return acc;
                      }, {})
                    ).length > 0 ? (
                      Object.entries(
                        archivedData.reduce((acc: any, curr: any) => {
                          const date = new Date(curr.weekStartDate).toISOString();
                          if (!acc[date]) acc[date] = 0;
                          acc[date]++;
                          return acc;
                        }, {})
                      ).map(([weekDate, count]: [string, any]) => (
                        <tr key={weekDate} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {new Date(weekDate).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {count} employees
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <Button 
                              size="sm"
                              variant="outline"
                              className="gap-1"
                              onClick={() => setViewingArchiveWeek(weekDate)}
                            >
                              <Calendar className="h-3 w-3" />
                              View Details
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">
                          No archived data for this month.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {isSuperAdmin && (
          <TabsContent value="settings" className="mt-4">
            <Card>
              <CardHeader className="pb-3 md:pb-6">
                <CardTitle className="text-lg md:text-2xl">System Settings</CardTitle>
                <CardDescription className="text-xs md:text-sm">Configure system-wide settings.</CardDescription>
              </CardHeader>
              <CardContent className="px-2 md:px-6 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 border rounded-lg bg-gradient-to-r from-amber-50 to-orange-50">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm md:text-base">Shift Entry Status</h3>
                    <p className="text-xs md:text-sm text-gray-600 mt-1">
                      {systemStatusQuery.data ? "Employees can currently submit shifts" : "Shift entry is disabled"}
                    </p>
                  </div>
                  <Switch
                    checked={systemStatusQuery.data || false}
                    onCheckedChange={(checked) => toggleOpenMutation.mutate({ isOpen: checked })}
                    disabled={toggleOpenMutation.isPending}
                  />
                </div>

                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 border rounded-lg bg-gradient-to-r from-red-50 to-pink-50">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm md:text-base">Reset All Shifts</h3>
                    <p className="text-xs md:text-sm text-gray-600 mt-1">Reset all employee shifts to OFF</p>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() => setIsResetDialogOpen(true)}
                    disabled={resetAllShiftsMutation.isPending}
                    className="w-full md:w-auto text-xs md:text-sm"
                  >
                    {resetAllShiftsMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Reset"
                    )}
                  </Button>
                </div>

                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm md:text-base">Auto Refresh</h3>
                    <p className="text-xs md:text-sm text-gray-600 mt-1">Automatically refresh data every 5 seconds</p>
                  </div>
                  <Switch
                    checked={autoRefresh}
                    onCheckedChange={setAutoRefresh}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
