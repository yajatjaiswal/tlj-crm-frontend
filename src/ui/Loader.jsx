import ClipLoader from "react-spinners/ClipLoader";

function Loader({ isLoading }) {
  return (
    <div className="flex items-center justify-center">
      <ClipLoader
        color="#ed5b36"
        loading={isLoading}
        size={150}
        aria-label="Loading Spinner"
        data-testid="loader"
      />
    </div>
  );
}

export default Loader;
