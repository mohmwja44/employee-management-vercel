import { useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Calendar, RefreshCw, ShieldCheck, Clock, Lock, LockOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Login from "./pages/Login";
import ShiftEntry from "./pages/ShiftEntry";
import ScheduleView from "./pages/ScheduleView";
import AdminPanel from "./pages/AdminPanel";

function EmployeeApp({ employee, onLogout }: { employee: any; onLogout: () => void }) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isSuperAdmin = employee?.isAdmin === 1 || employee?.ibsId === "000000";
  const systemStatusQuery = trpc.system.isOpen.useQuery();

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Calendar className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Shift Management</h1>
            {isSuperAdmin && (
              <span className="ml-4 px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                Admin
              </span>
            )}
            <div className="hidden sm:flex items-center ml-4">
              {systemStatusQuery.data ? (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1">
                  <LockOpen className="h-3 w-3" />
                  Entry Open
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 gap-1">
                  <Lock className="h-3 w-3" />
                  Entry Closed
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button
              onClick={handleManualRefresh}
              variant="ghost"
              size="sm"
              className="gap-2"
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{employee.name}</p>
              <p className="text-xs text-gray-500">ID: {employee.ibsId}</p>
            </div>
            <Button
              onClick={onLogout}
              variant="outline"
              size="sm"
              className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <Tabs defaultValue={isSuperAdmin ? "admin" : "my-shifts"} className="space-y-4">
          <TabsList className={`grid w-full max-w-md ${isSuperAdmin ? 'grid-cols-2' : 'grid-cols-2'} mx-auto`}>
            {isSuperAdmin && (
              <TabsTrigger value="admin" className="gap-2">
                <ShieldCheck className="h-4 w-4" />
                Admin
              </TabsTrigger>
            )}
            {!isSuperAdmin && (
              <TabsTrigger value="my-shifts" className="gap-2">
                <Clock className="h-4 w-4" />
                My Shifts
              </TabsTrigger>
            )}
            <TabsTrigger value="schedule" className="gap-2">
              <Calendar className="h-4 w-4" />
              Schedule
            </TabsTrigger>
          </TabsList>

          {isSuperAdmin && (
            <TabsContent value="admin" className="space-y-4">
              <AdminPanel currentEmployee={employee} />
            </TabsContent>
          )}

          {!isSuperAdmin && (
            <TabsContent value="my-shifts" className="space-y-4">
              <ShiftEntry employee={employee} />
            </TabsContent>
          )}

          <TabsContent value="schedule" className="space-y-4">
            <ScheduleView currentEmployee={employee} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function App() {
  const [currentEmployee, setCurrentEmployee] = useState<any>(null);

  const handleLoginSuccess = (employee: any) => {
    setCurrentEmployee(employee);
  };

  const handleLogout = () => {
    setCurrentEmployee(null);
  };

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          {currentEmployee ? (
            <EmployeeApp employee={currentEmployee} onLogout={handleLogout} />
          ) : (
            <Login onLoginSuccess={handleLoginSuccess} />
          )}
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
