import React, { useRef, useCallback } from 'react';
import { Card, Button, Badge, ProgressBar, Alert } from 'react-bootstrap';
import DeviceEntryCard, { validateIMEI } from './DeviceEntryCard';

/**
 * DeviceEntryList - Container for multiple device entry cards
 * 
 * @param {number} quantity - Number of devices to receive
 * @param {Array} devices - Array of device data objects
 * @param {Function} onChange - Called when devices array changes
 * @param {boolean} showSerial - Whether to show serial number field
 * @param {boolean} isSpareProduct - Whether this is for spare parts (shows Serial Number instead of IMEI)
 */
const DeviceEntryList = ({
    quantity = 0,
    devices = [],
    onChange,
    showSerial = false,
    isSpareProduct = false
}) => {
    const cardRefs = useRef([]);

    // Initialize devices array if empty
    React.useEffect(() => {
        if (quantity > 0 && devices.length !== quantity) {
            const newDevices = Array.from({ length: quantity }, (_, i) =>
                devices[i] || { imei_1: '', imei_2: '', condition: 'NEW', serial_number: '' }
            );
            onChange(newDevices);
        }
    }, [quantity, devices.length, onChange]);

    const handleDeviceChange = useCallback((index, value) => {
        const newDevices = [...devices];
        newDevices[index] = value;
        onChange(newDevices);
    }, [devices, onChange]);

    const handleComplete = useCallback((index) => {
        // Focus next card's IMEI1 input
        if (index < quantity - 1 && cardRefs.current[index + 1]) {
            cardRefs.current[index + 1].focus();
        }
    }, [quantity]);

    // Calculate completion stats
    const completedCount = devices.filter(d => d.imei_1 && validateIMEI(d.imei_1).valid).length;
    const progressPercent = quantity > 0 ? Math.round((completedCount / quantity) * 100) : 0;
    const hasErrors = devices.some(d => d.imei_1 && !validateIMEI(d.imei_1).valid);

    // Handle bulk paste
    const handleBulkPaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            const lines = text.split(/[\n,]/).map(l => l.trim()).filter(l => l);

            if (lines.length === 0) return;

            // Parse lines - could be single IMEI or IMEI1,IMEI2 pairs
            const newDevices = [...devices];
            let deviceIndex = 0;

            for (let i = 0; i < lines.length && deviceIndex < quantity; i++) {
                const parts = lines[i].split(/[\t;]/).map(p => p.trim());

                if (parts.length >= 2) {
                    // Two IMEIs on same line
                    newDevices[deviceIndex] = {
                        ...newDevices[deviceIndex],
                        imei_1: parts[0],
                        imei_2: parts[1]
                    };
                } else {
                    // Single IMEI - fill IMEI1 first, then IMEI2
                    if (!newDevices[deviceIndex].imei_1) {
                        newDevices[deviceIndex] = {
                            ...newDevices[deviceIndex],
                            imei_1: parts[0]
                        };
                    } else if (!newDevices[deviceIndex].imei_2) {
                        newDevices[deviceIndex] = {
                            ...newDevices[deviceIndex],
                            imei_2: parts[0]
                        };
                        deviceIndex++; // Move to next device after IMEI2 is filled
                    } else {
                        deviceIndex++;
                        if (deviceIndex < quantity) {
                            newDevices[deviceIndex] = {
                                ...newDevices[deviceIndex],
                                imei_1: parts[0]
                            };
                        }
                    }
                    continue;
                }
                deviceIndex++;
            }

            onChange(newDevices);
        } catch (err) {
            console.error('Failed to paste from clipboard:', err);
        }
    };

    // Clear all entries
    const handleClearAll = () => {
        const clearedDevices = devices.map(() => ({
            imei_1: '',
            imei_2: '',
            condition: 'NEW',
            serial_number: ''
        }));
        onChange(clearedDevices);
    };

    if (quantity === 0) {
        return null;
    }

    return (
        <div className="device-entry-list">
            {/* Header with progress */}
            <Card className="mb-3 border-primary">
                <Card.Header className="bg-primary text-white py-2">
                    <div className="d-flex justify-content-between align-items-center">
                        <div>
                            <i className={`fas ${isSpareProduct ? 'fa-cogs' : 'fa-mobile-alt'} me-2`}></i>
                            <strong>{isSpareProduct ? 'Serial Number Entry' : 'Device IMEI Entry'}</strong>
                            <Badge bg="light" text="dark" className="ms-2">
                                {completedCount} of {quantity} complete
                            </Badge>
                        </div>
                        <div className="d-flex gap-2">
                            <Button
                                variant="light"
                                size="sm"
                                onClick={handleBulkPaste}
                                title={isSpareProduct ? 'Paste Serial Numbers from clipboard' : 'Paste IMEIs from clipboard'}
                            >
                                <i className="fas fa-paste me-1"></i>
                                Paste
                            </Button>
                            <Button
                                variant="outline-light"
                                size="sm"
                                onClick={handleClearAll}
                                title="Clear all entries"
                            >
                                <i className="fas fa-eraser me-1"></i>
                                Clear
                            </Button>
                        </div>
                    </div>
                </Card.Header>
                <Card.Body className="py-2">
                    <ProgressBar
                        now={progressPercent}
                        variant={hasErrors ? 'danger' : completedCount === quantity ? 'success' : 'primary'}
                        label={`${progressPercent}%`}
                        style={{ height: '20px' }}
                    />
                    {hasErrors && (
                        <Alert variant="danger" className="mt-2 mb-0 py-1 small">
                            <i className="fas fa-exclamation-triangle me-1"></i>
                            Some {isSpareProduct ? 'serial numbers' : 'IMEIs'} have validation errors. Please correct them before submitting.
                        </Alert>
                    )}
                </Card.Body>
            </Card>

            {/* Device cards */}
            <div className="device-cards">
                {devices.map((device, index) => (
                    <DeviceEntryCard
                        key={index}
                        index={index}
                        total={quantity}
                        value={device}
                        onChange={handleDeviceChange}
                        onComplete={handleComplete}
                        showSerial={showSerial}
                        isSpareProduct={isSpareProduct}
                        imei1Ref={(el) => cardRefs.current[index] = el}
                    />
                ))}
            </div>

            {/* Summary */}
            {completedCount > 0 && (
                <Card className="mt-3 border-info">
                    <Card.Body className="py-2">
                        <small className="text-muted">
                            <i className="fas fa-info-circle me-1"></i>
                            Each device will create a separate inventory record in <code>serialized_inventory</code>.
                        </small>
                    </Card.Body>
                </Card>
            )}
        </div>
    );
};

export default DeviceEntryList;
