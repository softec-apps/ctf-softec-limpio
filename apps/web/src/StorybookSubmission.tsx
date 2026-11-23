import ChallengeSubmission from "./challenges/ChallengeSubmission";

export default function StorybookSubmission(props: {
  challengeId: string;
  title: string;
  disabled: boolean;
  onBusy: (busy: boolean) => void;
}) {
  return <ChallengeSubmission {...props} />;
}
