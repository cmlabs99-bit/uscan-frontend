const SelectionBanner = ({ selectedCount, onAddToList }) => {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-3 right-3 transform z-50">
      <div className="relative">
        {/* Animated glow background */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-pink-400  to-cyan-400 animate-pulse opacity-75 blur-sm scale-110"></div>

        {/* Main button */}
        <button
          onClick={onAddToList}
          className="relative w-16 h-16 rounded-full border-0 border-transparent bg-clip-padding shadow-2xl hover:scale-125 active:scale-95 transition-all duration-300 flex flex-col items-center justify-center group overflow-hidden"
        >
          {/* Content */}
          <div className="relative z-10 flex flex-col items-center">
            <div className="text-2xl font-black  text-white bg-clip-text text-transparent drop-shadow-lg transform group-hover:scale-110 transition-transform duration-200">
              {selectedCount}
            </div>
            <div className="text-xs font-bold  text-white bg-clip-text text-transparent drop-shadow-md">ADD</div>
          </div>

          {/* Hover effect overlay */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-200 to-blue-200 opacity-0 group-hover:opacity-30 transition-opacity duration-300"></div>
        </button>

      </div>
    </div>
  );
};

export default SelectionBanner;
