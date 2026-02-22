import { useParams } from "react-router-dom";

export function VisitChatPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-2xl font-bold text-gray-900">
        Talk to Your Prescription
      </h1>
      <p className="mt-2 text-gray-600">Visit ID: {id}</p>
    </main>
  );
}
