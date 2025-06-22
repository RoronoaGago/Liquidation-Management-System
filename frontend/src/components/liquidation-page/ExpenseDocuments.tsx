// // Example document viewer component
// const DocumentViewer = ({ document }) => (
//   <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
//     <Paperclip className="h-5 w-5 text-gray-500" />
//     <a
//       href={document.url}
//       target="_blank"
//       className="text-blue-600 hover:underline"
//     >
//       {document.name}
//     </a>
//     <span className="text-sm text-gray-500 ml-auto">
//       Uploaded: {formatDate(document.uploaded_at)}
//     </span>
//   </div>
// )
// const ExpenseDocuments = ({ expense, mode = "view" }) => (
//   <div className="border rounded-lg overflow-hidden">
//     <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
//       <h3 className="font-medium">{expense.title}</h3>
//       <span className="text-sm text-gray-600">
//         ₱{expense.amount.toLocaleString()}
//       </span>
//     </div>
//     <div className="p-4 space-y-3">
//       {expense.requirements.map((req) => {
//         const doc = getUploadedDocument(expense.id, req.requirementID);
//         return doc ? (
//           <DocumentViewer key={doc.id} document={doc} />
//         ) : (
//           <div key={req.requirementID} className="text-sm text-gray-500 italic">
//             {req.requirementTitle} - Not submitted
//           </div>
//         );
//       })}
//     </div>
//   </div>
// );
