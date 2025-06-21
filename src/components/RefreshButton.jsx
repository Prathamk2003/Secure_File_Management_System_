import React from 'react';
import { FaSyncAlt } from 'react-icons/fa';

const RefreshButton = ({ onClick }) => (
  <button
    onClick={onClick}
    className="flex items-center px-3 py-1 bg-white border rounded shadow hover:bg-gray-100 transition"
    title="Refresh"
  >
    <FaSyncAlt className="mr-2" />
    Refresh
  </button>
);

export default RefreshButton;