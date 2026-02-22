import { useParams } from "react-router-dom";

export function VisitPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-2xl font-bold text-gray-900">Visit Details</h1>
      <p className="mt-2 text-gray-600">Visit ID: {id}</p>
    </main>
  );
}
