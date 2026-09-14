import { Submission } from '../types';
import { LocalDatabase, ScreeningData } from './localDatabase';

export class ScreeningSimulator {
  /**
   * Faylni asinxron tekshirish simulyatsiyasi (Antiplagiat + AI + Format)
   * 1.5 - 2.5 soniya davomida real progress ko'rsatib ishlaydi
   */
  static async runScreening(
    submission: Submission,
    onProgress?: (stage: string, percent: number) => void
  ): Promise<ScreeningData> {
    onProgress?.("Fayl tuzilmasi va format talablari tahlil qilinmoqda (VMQ 26-33)...", 20);
    await this.delay(600);

    onProgress?.("O'zbekiston Milliy ilmiy bazalari bo'yicha matn o'xshashligi tekshirilmoqda...", 50);
    await this.delay(700);

    onProgress?.("Sun'iy intellekt (AI) sintaktik indikatori hisoblanmoqda...", 80);
    await this.delay(600);

    // Fayl nomiga yoki turiga qarab dinamik ko'rsatkichlar
    const isPlagiatHigh = submission.file_name.toLowerCase().includes('copy') || submission.file_name.toLowerCase().includes('plagiat');
    const plagiarismPercentage = isPlagiatHigh ? 38.5 : Math.round((7.5 + Math.random() * 2.0) * 10) / 10; // ~8.4%
    const aiIndicatorPercentage = Math.round((10.5 + Math.random() * 1.5) * 10) / 10; // ~11.2%

    const band: 'yashil' | 'sariq' | 'qizil' =
      plagiarismPercentage <= 20 ? 'yashil' :
      plagiarismPercentage <= 30 ? 'sariq' : 'qizil';

    const result: ScreeningData = {
      submissionId: submission.id,
      formatCheckPassed: true,
      formatCriteriaChecked: 11,
      formatCriteriaTotal: 11,
      plagiarismPercentage,
      plagiarismBand: band,
      aiIndicatorPercentage,
      matchedSources: [
        {
          title: "Muhammed al-Xorazmiy avlodlari, 2026, № 1(27), 84-91-b.",
          url: "https://doi.org/10.37722/jhet.2026.01.014",
          percentage: Math.round((plagiarismPercentage * 0.45) * 10) / 10
        },
        {
          title: "Zamonaviy AKT va raqamli iqtisodiyot xalqaro ilmiy-amaliy anjumani to'plami, Navoiy, 2026",
          url: "https://ict-conference.uz/proceedings/2026",
          percentage: Math.round((plagiarismPercentage * 0.35) * 10) / 10
        },
        {
          title: "Oliy ta'limda talabalar faoliyatini intellektual monitoring qilish milliy ilmiy reestri",
          url: "https://ziyouz.com/kutubxona/magistratura",
          percentage: Math.round((plagiarismPercentage * 0.20) * 10) / 10
        }
      ],
      screenedAt: new Date().toISOString()
    };

    // Natijani LocalDatabase'ga saqlash
    LocalDatabase.setScreening(submission.id, result);

    await LocalDatabase.addAuditEntry(
      'SCREENING_COMPLETED',
      'SCREENING',
      String(submission.id),
      `"${submission.file_name}" uchun screening yakunlandi: Plagiat: ${plagiarismPercentage}% (${band.toUpperCase()}), AI indikator: ${aiIndicatorPercentage}% (VMQ talabi bo'yicha jarimasiz)`,
      submission.student_id
    );

    onProgress?.("Dastlabki tekshiruv to'liq yakunlandi!", 100);
    return result;
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
