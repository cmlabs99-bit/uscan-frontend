const LoadingOverlay = ({ message = "Loading..." }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
    <div className="bg-white rounded-lg p-6 flex items-center space-x-3">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#498ea7]"></div>
      <span className="text-gray-700">{message}</span>
    </div>
  </div>
);

export default LoadingOverlay;
