import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, FileDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const DAYS = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const SHIFT_TYPES = ["Opening", "Mid", "Late", "OFF"];

// UI Colors (Tailwind)
const SHIFT_COLORS: Record<string, string> = {
  Late: "bg-[#4472c4] text-white",
  Opening: "bg-[#ed7d31] text-white",
  Mid: "bg-[#70ad47] text-white",
  OFF: "bg-[#ffc000] text-black",
  Shadowing: "bg-[#ffff00] text-black",
};

// PDF Colors (RGB) - Matching the provided image exactly
const PDF_COLORS: Record<string, [number, number, number]> = {
  Late: [68, 114, 196],      // Blue
  Opening: [237, 125, 49],    // Orange
  Mid: [112, 173, 71],       // Green
  OFF: [255, 192, 0],        // Yellow
  Shadowing: [255, 255, 0],  // Bright Yellow
  Header: [180, 180, 180],   // Grey for Header
  TableLines: [0, 0, 0],     // Black lines
};

interface ScheduleViewProps {
  currentEmployee?: {
    id: number;
    ibsId: string;
    name: string;
    isAdmin: number;
  };
}

export default function ScheduleView({ currentEmployee }: ScheduleViewProps) {
  const [shiftCounts, setShiftCounts] = useState<Record<string, Record<string, number>>>({});

  const shiftsQuery = trpc.shifts.getAll.useQuery();

  useEffect(() => {
    if (shiftsQuery.data) {
      const counts: Record<string, Record<string, number>> = {};
      
      DAYS.forEach(day => {
        counts[day] = {
          Late: 0,
          Opening: 0,
          Mid: 0,
          OFF: 0,
          Shadowing: 0,
        };
      });

      (shiftsQuery.data || [])
        .filter(({ employee }) => employee.isAdmin !== 1)
        .forEach(({ shift }) => {
          if (shift) {
            DAYS.forEach(day => {
              const d = day.toLowerCase() as keyof typeof shift;
              const val = (shift[d] as string) || "OFF";
              // Ensure we only count known shift types to avoid pollution
              const knownTypes = ["Opening", "Mid", "Late", "OFF", "Shadowing"];
              const countVal = knownTypes.includes(val) ? val : "OFF";
              
              if (counts[day][countVal] !== undefined) {
                counts[day][countVal]++;
              } else {
                counts[day][countVal] = 1;
              }
            });
          }
        });

      setShiftCounts(counts);
    }
  }, [shiftsQuery.data]);

  const exportToPDF = () => {
    if (!shiftsQuery.data) return;

    const doc = new jsPDF("landscape", "mm", "a4");
    
    // Header Row with Dates (Simulated from the image)
    const tableHeader = [
      [
        { content: "IBS ID", rowSpan: 2, styles: { halign: 'center', valign: 'middle', fontStyle: 'bold' } },
        { content: "Name", rowSpan: 2, styles: { halign: 'center', valign: 'middle', fontStyle: 'bold' } },
        { content: "Saturday", styles: { halign: 'center', fontStyle: 'bold' } },
        { content: "Sunday", styles: { halign: 'center', fontStyle: 'bold' } },
        { content: "Monday", styles: { halign: 'center', fontStyle: 'bold' } },
        { content: "Tuesday", styles: { halign: 'center', fontStyle: 'bold' } },
        { content: "Wednesday", styles: { halign: 'center', fontStyle: 'bold' } },
        { content: "Thursday", styles: { halign: 'center', fontStyle: 'bold' } },
        { content: "Friday", styles: { halign: 'center', fontStyle: 'bold' } }
      ],
      [
        "10-Jan-26", "11-Jan-26", "12-Jan-26", "13-Jan-26", "14-Jan-26", "15-Jan-26", "16-Jan-26"
      ]
    ];

    const employeesWithShifts = (Array.isArray(shiftsQuery.data) ? shiftsQuery.data : [])
      .filter(({ employee }) => employee && employee.isAdmin !== 1)
      .sort((a, b) => Number(a.employee.ibsId) - Number(b.employee.ibsId));

    const tableRows = employeesWithShifts.map(({ employee, shift }) => [
      employee.ibsId,
      employee.name,
      shift?.saturday || "OFF",
      shift?.sunday || "OFF",
      shift?.monday || "OFF",
      shift?.tuesday || "OFF",
      shift?.wednesday || "OFF",
      shift?.thursday || "OFF",
      shift?.friday || "OFF",
    ]);

    // Main Schedule Table
    autoTable(doc, {
      head: tableHeader,
      body: tableRows,
      startY: 10,
      theme: "grid",
      styles: {
        fontSize: 9,
        cellPadding: 1.5,
        lineColor: [0, 0, 0],
        lineWidth: 0.1,
        textColor: [0, 0, 0],
      },
      headStyles: { 
        fillColor: PDF_COLORS.Header, 
        textColor: [0, 0, 0], 
      },
      columnStyles: {
        0: { cellWidth: 20, halign: 'center' },
        1: { cellWidth: 45, halign: 'left', fontStyle: 'bold' },
        2: { cellWidth: 24, halign: 'center' },
        3: { cellWidth: 24, halign: 'center' },
        4: { cellWidth: 24, halign: 'center' },
        5: { cellWidth: 24, halign: 'center' },
        6: { cellWidth: 24, halign: 'center' },
        7: { cellWidth: 24, halign: 'center' },
        8: { cellWidth: 24, halign: 'center' },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index >= 2) {
          const val = data.cell.raw as string;
          if (val === "Late") {
            data.cell.styles.fillColor = PDF_COLORS.Late;
          } else if (val === "Opening") {
            data.cell.styles.fillColor = PDF_COLORS.Opening;
          } else if (val === "Mid") {
            data.cell.styles.fillColor = PDF_COLORS.Mid;
          } else if (val === "OFF") {
            data.cell.styles.fillColor = PDF_COLORS.OFF;
          } else if (val === "Shadowing") {
            data.cell.styles.fillColor = PDF_COLORS.Shadowing;
          }
        }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;

    // Shift Counts Table
    const countRows = [
      ["Opening Shift", ...DAYS.map(d => shiftCounts[d]?.["Opening"] || 0)],
      ["Mid Shift", ...DAYS.map(d => shiftCounts[d]?.["Mid"] || 0)],
      ["Late Shift", ...DAYS.map(d => shiftCounts[d]?.["Late"] || 0)],
    ];

    autoTable(doc, {
      body: countRows,
      startY: finalY,
      theme: "grid",
      styles: {
        fontSize: 10,
        cellPadding: 2,
        lineColor: [0, 0, 0],
        lineWidth: 0.1,
        halign: 'center',
        textColor: [0, 0, 0],
      },
      columnStyles: {
        0: { cellWidth: 65, fillColor: PDF_COLORS.Header, fontStyle: 'bold', halign: 'center' },
        1: { cellWidth: 24 },
        2: { cellWidth: 24 },
        3: { cellWidth: 24 },
        4: { cellWidth: 24 },
        5: { cellWidth: 24 },
        6: { cellWidth: 24 },
        7: { cellWidth: 24 },
      }
    });

    const summaryY = (doc as any).lastAutoTable.finalY + 10;

    // Shift Times Legend Table
    const legendRows = [
      ["Opening all days", "10:00 AM", "", ""],
      ["Mid all days", "12:00 PM", "", ""],
      ["Mid-WeekEnd", "1:00 PM", "", ""],
      ["Late- Weekdays", "2:00 PM", "", ""],
      ["Late-WeekEnd", "3:00 PM", "", ""],
    ];

    autoTable(doc, {
      body: legendRows,
      startY: summaryY,
      theme: "grid",
      styles: {
        fontSize: 10,
        cellPadding: 2,
        lineColor: [0, 0, 0],
        lineWidth: 0.1,
        textColor: [0, 0, 0],
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 65, halign: 'center' },
        1: { cellWidth: 40, fillColor: PDF_COLORS.OFF, halign: 'center' },
        2: { cellWidth: 40, fillColor: PDF_COLORS.OFF },
        3: { cellWidth: 40, fillColor: PDF_COLORS.OFF },
      },
      didParseCell: (data) => {
        if (data.column.index === 0) {
          const label = data.cell.raw as string;
          if (label.includes("Opening")) data.cell.styles.fillColor = PDF_COLORS.Opening;
          else if (label.includes("Mid")) data.cell.styles.fillColor = PDF_COLORS.Mid;
          else if (label.includes("Late")) data.cell.styles.fillColor = PDF_COLORS.Late;
        }
      }
    });

    doc.save("Shift_Schedule.pdf");
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

  const isSuperAdmin = currentEmployee?.ibsId === "000000";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Schedule View</h2>
          <p className="text-muted-foreground">View all employee shifts and daily summaries.</p>
        </div>
        {isSuperAdmin && (
          <Button onClick={exportToPDF} variant="default" className="bg-[#4472c4] hover:bg-[#365ba3] gap-2">
            <FileDown className="h-4 w-4" />
            Export PDF
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Employee Weekly Schedule</CardTitle>
          <CardDescription>
            Saturday to Friday shift assignments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto border rounded-md">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b">
                  <th className="p-2 border-r text-center font-bold">IBS ID</th>
                  <th className="p-2 border-r text-left font-bold min-w-[150px]">Name</th>
                  {DAYS.map(day => (
                    <th key={day} className="p-2 border-r text-center font-bold min-w-[100px]">{day}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employeesWithShifts.map(({ employee, shift }) => (
                  <tr key={employee.id} className="border-b hover:bg-slate-50 transition-colors">
                    <td className="p-2 border-r text-center">{employee.ibsId}</td>
                    <td className="p-2 border-r font-bold">{employee.name}</td>
                    {DAYS.map(day => {
                      const d = day.toLowerCase() as keyof typeof shift;
                      const shiftType = (shift?.[d] as string) || "OFF";
                      return (
                        <td key={day} className="p-1 border-r text-center">
                          <div className={`py-1 px-2 rounded text-xs font-medium ${SHIFT_COLORS[shiftType] || "bg-gray-100"}`}>
                            {shiftType}
                          </div>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Daily Shift Counts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto border rounded-md">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b">
                    <th className="p-2 border-r text-left font-bold">Shift Type</th>
                    {DAYS.map(day => (
                      <th key={day} className="p-2 border-r text-center font-bold">{day.substring(0, 3)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {["Opening", "Mid", "Late"].map(type => (
                    <tr key={type} className="border-b">
                      <td className="p-2 border-r font-medium">{type}</td>
                      {DAYS.map(day => (
                        <td key={day} className="p-2 border-r text-center">
                          {shiftCounts[day]?.[type] || 0}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Shift Times Reference</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded bg-[#ed7d31] text-white">
                <span className="font-bold">Opening all days</span>
                <span>10:00 AM</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-[#70ad47] text-white">
                <span className="font-bold">Mid all days</span>
                <span>12:00 PM</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-[#70ad47] text-white opacity-90">
                <span className="font-bold">Mid-WeekEnd</span>
                <span>1:00 PM</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-[#4472c4] text-white">
                <span className="font-bold">Late- Weekdays</span>
                <span>2:00 PM</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-[#4472c4] text-white opacity-90">
                <span className="font-bold">Late-WeekEnd</span>
                <span>3:00 PM</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
