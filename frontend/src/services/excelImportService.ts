import * as XLSX from 'xlsx';
import { NotificationService } from './notificationService';

export interface ParsedStudentRow {
  full_name: string;
  hemis_id: string;
  specialty: string;
  course_year: number;
  email?: string;
  dissertation_topic?: string;
  supervisor_name?: string;
}

export class ExcelImportService {
  /**
   * Rasmiy NDKTU Magistrantlar import shablonini (XLSX) generatsiya qilish va yuklash
   */
  static downloadStudentTemplate(): void {
    const templateRows = [
      {
        "№": 1,
        "Magistrant F.I.SH.": "Bozorov Bobur Qudrat o‘g‘li",
        "HEMIS ID": "3842100451",
        "Mutaxassislik": "70610101 – Kompyuter tizimlari va dasturiy injiniring",
        "Kurs (1 yoki 2)": 2,
        "Email": "b.bozorov@edu.uz",
        "Dissertatsiya mavzusi": "Oliy ta'lim jarayonlarida talabalar faoliyatini monitoring qilish tizimlarini ishlab chiqish",
        "Ilmiy rahbar F.I.SH.": "Dotsent, t.f.n. A. Qodirov"
      },
      {
        "№": 2,
        "Magistrant F.I.SH.": "Madina Rahimova",
        "HEMIS ID": "3842100452",
        "Mutaxassislik": "70610101 – Kompyuter tizimlari va dasturiy injiniring",
        "Kurs (1 yoki 2)": 2,
        "Email": "m.rahimova@edu.uz",
        "Dissertatsiya mavzusi": "Taqsimlangan tizimlarda ma'lumotlar xavfsizligini ta'minlash modellari",
        "Ilmiy rahbar F.I.SH.": "Prof. Otabek Rustamov"
      },
      {
        "№": 3,
        "Magistrant F.I.SH.": "Jasur Karimov",
        "HEMIS ID": "3842100454",
        "Mutaxassislik": "70720101 – Konchilik ishi va geologik modellashtirish",
        "Kurs (1 yoki 2)": 1,
        "Email": "j.karimov@edu.uz",
        "Dissertatsiya mavzusi": "Kon korxonalarida texnologik jarayonlarni avtomatlashtirish",
        "Ilmiy rahbar F.I.SH.": "Dots. Jamshid Nurmatov"
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateRows);

    ws['!cols'] = [
      { wch: 6 },
      { wch: 32 },
      { wch: 16 },
      { wch: 45 },
      { wch: 16 },
      { wch: 25 },
      { wch: 55 },
      { wch: 30 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Magistrantlar");
    XLSX.writeFile(wb, "NDKTU_Magistrantlar_Import_Shabloni.xlsx");

    NotificationService.success(
      "Shablon yuklab olindi",
      "NDKTU_Magistrantlar_Import_Shabloni.xlsx fayli kompyuteringizga saqlandi."
    );
  }

  /**
   * Yuklangan Excel faylni o'qish, tahlil qilish va validatsiyadan o'tkazish
   */
  static async parseStudentExcel(file: File): Promise<{
    students: ParsedStudentRow[];
    errors: string[];
    totalRows: number;
  }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];

          const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
          const students: ParsedStudentRow[] = [];
          const errors: string[] = [];

          rawJson.forEach((row, index) => {
            const rowNum = index + 2; // Excel header 1-qator

            const fullName = (
              row['Magistrant F.I.SH.'] || 
              row['F.I.SH'] || 
              row['F.I.Sh'] || 
              row['FISH'] || 
              row['Full Name'] || 
              row['Ism'] || ''
            ).toString().trim();

            const hemisId = (
              row['HEMIS ID'] || 
              row['Hemis ID'] || 
              row['hemis_id'] || 
              row['ID'] || ''
            ).toString().trim();

            const specialty = (
              row['Mutaxassislik'] || 
              row['Mutaxassisligi'] || 
              row['Specialty'] || 
              row['Yonalish'] || ''
            ).toString().trim();

            const courseYear = parseInt(
              row['Kurs (1 yoki 2)'] || 
              row['Kurs'] || 
              row['kurs'] || 
              row['Course'] || '1', 
              10
            );

            const email = (row['Email'] || row['email'] || '').toString().trim();
            const dissertationTopic = (row['Dissertatsiya mavzusi'] || row['Mavzu'] || '').toString().trim();
            const supervisorName = (row['Ilmiy rahbar F.I.SH.'] || row['Ilmiy rahbar'] || '').toString().trim();

            if (!fullName || fullName.length < 3) {
              errors.push(`${rowNum}-qatorda F.I.SH to'liq kiritilmagan.`);
              return;
            }

            if (!hemisId) {
              errors.push(`${rowNum}-qatorda (${fullName}) HEMIS ID mavjud emas.`);
              return;
            }

            students.push({
              full_name: fullName,
              hemis_id: hemisId,
              specialty: specialty || "70610101 – Kompyuter tizimlari va dasturiy injiniring",
              course_year: courseYear === 2 ? 2 : 1,
              email: email || `${hemisId}@edu.uz`,
              dissertation_topic: dissertationTopic,
              supervisor_name: supervisorName
            });
          });

          resolve({
            students,
            errors,
            totalRows: rawJson.length
          });
        } catch (err: any) {
          reject(new Error("Excel faylni o'qishda xatolik: " + err.message));
        }
      };

      reader.onerror = () => {
        reject(new Error("Faylni o'qish jarayonida xatolik yuz berdi."));
      };

      reader.readAsArrayBuffer(file);
    });
  }
}
