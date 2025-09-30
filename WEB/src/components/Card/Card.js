export default function Card({ title, description, extra }) {
  return (
    <div className="bg-white rounded-2xl shadow-md p-4 w-full max-w-md border">
      <h2 className="text-xl font-bold text-gray-800">{title}</h2>
      {description && <p className="text-gray-600 mt-2">{description}</p>}
      {extra && <div className="mt-3">{extra}</div>}
    </div>
  );
}
