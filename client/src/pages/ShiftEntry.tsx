import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, CheckCircle, Lock } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DAYS = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const SHIFT_TYPES = ["Late", "Opening", "Mid", "OFF"];

interface ShiftEntryProps {
  employee: any;
}

export default function ShiftEntry({ employee }: ShiftEntryProps) {
  const [shifts, setShifts] = useState<Record<string, string>>({
    Saturday: "OFF",
    Sunday: "OFF",
    Monday: "OFF",
    Tuesday: "OFF",
    Wednesday: "OFF",
    Thursday: "OFF",
    Friday: "OFF",
  });
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const getCurrentShiftQuery = trpc.shifts.getCurrent.useQuery(
    { employeeId: employee.id },
    { enabled: !!employee.id }
  );

  const systemStatusQuery = trpc.system.isOpen.useQuery();

  const submitShiftMutation = trpc.shifts.submit.useMutation();

  useEffect(() => {
    if (!getCurrentShiftQuery.isLoading) {
      if (getCurrentShiftQuery.data) {
        const shift = getCurrentShiftQuery.data;
        setShifts({
          Saturday: shift.saturday || "OFF",
          Sunday: shift.sunday || "OFF",
          Monday: shift.monday || "OFF",
          Tuesday: shift.tuesday || "OFF",
          Wednesday: shift.wednesday || "OFF",
          Thursday: shift.thursday || "OFF",
          Friday: shift.friday || "OFF",
        });
      }
      setIsLoading(false);
    }
  }, [getCurrentShiftQuery.isLoading, getCurrentShiftQuery.data]);

  const handleShiftChange = (day: string, value: string) => {
    setShifts(prev => ({
      ...prev,
      [day]: value,
    }));
  };

  const handleSubmit = async () => {
    setSuccessMessage("");
    try {
      await submitShiftMutation.mutateAsync({
        employeeId: employee.id,
        saturday: shifts.Saturday,
        sunday: shifts.Sunday,
        monday: shifts.Monday,
        tuesday: shifts.Tuesday,
        wednesday: shifts.Wednesday,
        thursday: shifts.Thursday,
        friday: shifts.Friday,
      });
      setSuccessMessage("Your schedule has been submitted successfully!");
      toast.success("Schedule submitted successfully");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error(err);
      toast.error("Failed to submit schedule");
    }
  };

  if (isLoading || systemStatusQuery.isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const isClosed = systemStatusQuery.data === false;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Shift Schedule</CardTitle>
        <CardDescription>
          Select your shift for each day of the week
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isClosed && (
          <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800">
            <Lock className="h-4 w-4 text-red-600" />
            <AlertTitle>Shift Entry Closed</AlertTitle>
            <AlertDescription>
              The administrator has closed the shift entry window. You can view your current shifts but cannot make any changes at this time.
            </AlertDescription>
          </Alert>
        )}

        {successMessage && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {DAYS.map(day => (
            <div key={day} className="space-y-2">
              <label className="text-sm font-medium">{day}</label>
              <Select 
                value={shifts[day]} 
                onValueChange={(value) => handleShiftChange(day, value)}
                disabled={isClosed}
              >
                <SelectTrigger className={isClosed ? "bg-muted" : ""}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SHIFT_TYPES.map(shiftType => (
                    <SelectItem key={shiftType} value={shiftType}>
                      {shiftType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>

        {!isClosed && (
          <Button
            onClick={handleSubmit}
            disabled={submitShiftMutation.isPending}
            className="w-full"
            size="lg"
          >
            {submitShiftMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Schedule"
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
