import React, { useEffect, useState, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import s3 from './aws-config';
import './App.css';

Chart.register(...registerables);

const FileUploader = ({ onFileUploaded }) => {
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);
  };

  const handleUpload = () => {
    if (selectedFile) {
      const params = {
        Bucket: 'react-accesslogs', // Replace with your S3 bucket name
        Key: selectedFile.name,
        Body: selectedFile,
      };

      s3.upload(params, (error, data) => {
        if (error) {
          console.error(error);
        } else {
          console.log('File uploaded successfully!', data.Location);
          onFileUploaded(data.Location);
        }
      });
    }
  };

  return (
    <div>
      <input type="file" onChange={handleFileChange} />
      <button onClick={handleUpload}>Upload</button>
    </div>
  );
};

const LogChart = () => {
  const barChartRef = useRef(null);
  const pieChartRef = useRef(null);
  const [logData, setLogData] = useState([]);
  const [objectURL, setObjectURL] = useState('');

  const handleFileUploaded = (objectURL) => {
    setObjectURL(objectURL);
  };

  const fetchLogData = async (objectURL) => {
    try {
      const response = await fetch(objectURL);
      const text = await response.text();
      console.log('Fetched log data:', text); // Log the fetched data
      const lines = text.split('\n');
      const errorCodes = {};

      lines.forEach((line) => {
        const matches = line.match(/HTTP\/1.1" (\d+)/);
        if (matches && matches.length > 1) {
          const errorCode = matches[1];
          errorCodes[errorCode] = (errorCodes[errorCode] || 0) + 1;
        }
      });

      console.log('Parsed log data:', errorCodes); // Log the parsed data
      setLogData(errorCodes);
    } catch (error) {
      console.error('Error fetching log data:', error);
    }
  };

  useEffect(() => {
    if (objectURL) {
      fetchLogData(objectURL);
    }
  }, [objectURL]);

  useEffect(() => {
    if (barChartRef.current && Object.keys(logData).length > 0) {
      const ctx = barChartRef.current.getContext('2d');
      const labels = Object.keys(logData);
      const data = Object.values(logData);

      const barChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Error Codes',
              data,
              backgroundColor: 'rgba(75, 192, 192, 0.6)',
              borderColor: 'rgba(75, 192, 192, 1)',
              borderWidth: 1,
            },
          ],
        },
        options: {
          scales: {
            y: {
              beginAtZero: true,
              precision: 0,
            },
          },
        },
      });

      // Clear chart on component unmount
      return () => {
        barChart.destroy();
      };
    }
  }, [logData]);

  useEffect(() => {
    if (pieChartRef.current && Object.keys(logData).length > 0) {
      const ctx = pieChartRef.current.getContext('2d');
      const labels = Object.keys(logData);
      const data = Object.values(logData);

      const pieChart = new Chart(ctx, {
        type: 'pie',
        data: {
          labels,
          datasets: [
            {
              data,
              backgroundColor: [
                'rgba(255, 99, 132, 0.6)',
                'rgba(54, 162, 235, 0.6)',
                'rgba(255, 206, 86, 0.6)',
                'rgba(75, 192, 192, 0.6)',
                'rgba(153, 102, 255, 0.6)',
              ],
              borderColor: [
                'rgba(255, 99, 132, 1)',
                'rgba(54, 162, 235, 1)',
                'rgba(255, 206, 86, 1)',
                'rgba(75, 192, 192, 1)',
                'rgba(153, 102, 255, 1)',
              ],
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: 'top',
            },
            title: {
              display: true,
              text: 'Error Code Distribution',
            },
          },
          layout: {
            padding: {
              left: 10,
              right: 10,
              top: 10,
              bottom: 10,
            },
          },
        },
      });

      // Clear chart on component unmount
      return () => {
        pieChart.destroy();
      };
    }
  }, [logData]);

  return (
    <>
      <div className="dashboard">
        <FileUploader onFileUploaded={handleFileUploaded} />

        <div className="flex">
          <div className="flex-auto w-full">
            <div className="flex gap-8 flex-wrap">
              <div className="flex-none w-full page-head font-semibold text-gray-900">
                <h3>Error Codes</h3>
              </div>
              <div className="flex-auto w-64 ml-3">
                <div className="rounded shadow-lg bg-slate-50 p-5 ml-3 height:full">
                  <canvas ref={barChartRef} />
                </div>
              </div>
              <div className="flex-auto w-32 mr-3">
                <div className="rounded shadow-lg bg-slate-50 p-5 mr-3 height:full">
                  <canvas
                    ref={pieChartRef}
                    style={{ width: '50%', margin: '0 auto' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default LogChart;
