const ReviewTimeline = () => (
  <div className="mt-6 space-y-4">
    <h3 className="font-medium">Review Process</h3>
    <div className="flex items-start">
      <div className="flex flex-col items-center mr-4">
        <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white">
          1
        </div>
        <div className="w-px h-12 bg-gray-300 my-1"></div>
      </div>
      <div className="pt-1">
        <p className="font-medium">District Review</p>
        <p className="text-sm text-gray-600">
          Expected within 3-5 working days
        </p>
        <p className="text-sm text-gray-500">Reviewer: District Admin</p>
      </div>
    </div>
    {/* Additional steps... */}
  </div>
);
export default ReviewTimeline;
