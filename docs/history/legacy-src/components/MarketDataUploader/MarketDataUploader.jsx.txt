import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useFileUpload } from '../../hooks/useFileUpload';
import UploadProgress from './UploadProgress';
import ValidationErrors from './ValidationErrors';

const MarketDataUploader = () => {
    const [files, setFiles] = useState([]);
    const { uploadFiles, progress, errors } = useFileUpload();

    const onDrop = (acceptedFiles) => {
        setFiles(acceptedFiles);
    };

    const handleUpload = () => {
        uploadFiles(files);
    };

    const { getRootProps, getInputProps } = useDropzone({ onDrop });

    return (
        <div {...getRootProps()} className="dropzone">
            <input {...getInputProps()} />
            <p>Drag & drop files here, or click to select files</p>
            <button onClick={handleUpload} disabled={!files.length}>Upload</button>
            {progress && <UploadProgress progress={progress} />}
            {errors && <ValidationErrors errors={errors} />}
        </div>
    );
};

export default MarketDataUploader;