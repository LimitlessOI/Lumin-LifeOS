import React from 'react';

const UploadProgress = ({ progress }) => {
    return (
        <div className="upload-progress">
            <progress value={progress} max="100">{progress}%</progress>
            <span>{progress}%</span>
        </div>
    );
};

export default UploadProgress;