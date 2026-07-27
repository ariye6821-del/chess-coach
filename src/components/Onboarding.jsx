import { setOnboarded } from '../lib/trainingPlan';
import { TrainingPlanScreen } from './TrainingPlanScreen';

/**
 * First-run modal: introduces the app and offers to analyze the visitor's last
 * 10 Chess.com games into a personalized training plan. Fully skippable - the
 * same flow is always reachable later from the "תוכנית אימונים" tab.
 */
export function Onboarding({ onClose, onNavigate }) {
  const handleSkip = () => {
    setOnboarded();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl sm:p-6">
        <div dir="rtl" className="mb-4 text-center">
          <h2 className="text-2xl font-bold text-slate-100">♟️ ברוכים הבאים למאמן השחמט שלי!</h2>
          <p className="mt-2 text-sm text-slate-400">
            נעים להכיר! אם יש לכם חשבון ב-Chess.com, נשמח לנתח את המשחקים האחרונים שלכם ולבנות לכם תוכנית אימונים אישית -
            זה לוקח דקה או שתיים.
          </p>
        </div>

        <TrainingPlanScreen
          showSkip
          onSkip={handleSkip}
          onNavigate={(tab) => {
            setOnboarded();
            onNavigate(tab);
          }}
          onFinish={() => {
            setOnboarded();
            onClose();
          }}
        />
      </div>
    </div>
  );
}
