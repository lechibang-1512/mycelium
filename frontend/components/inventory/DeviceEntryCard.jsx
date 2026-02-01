import React, { useState, useRef, useEffect } from 'react';
import { Card, Form, Row, Col, Badge, Collapse } from 'react-bootstrap';

/**
 * IMEI validation - DISABLED
 * Validation has been disabled to allow any IMEI format
 */
const validateIMEI = (imei) => {
    if (!imei) return { valid: true, message: '' }; // Empty is valid (optional)

    // Validation disabled - always return valid
    return { valid: true, message: 'IMEI accepted' };
};

/**
 * DeviceEntryCard - Single device entry with IMEI1/IMEI2 fields
 * 
 * @param {number} index - Device index (0-based)
 * @param {number} total - Total number of devices
 * @param {Object} value - Current values { imei_1, imei_2, condition, serial_number }
 * @param {Function} onChange - Called when values change
 * @param {Function} onComplete - Called when this card is complete (auto-focus next)
 * @param {boolean} showSerial - Whether to show serial number field (for non-phone items)
 * @param {boolean} isSpareProduct - Whether this is for spare parts (shows Serial Number instead of IMEI)
 * @param {React.Ref} imei1Ref - Ref for IMEI1 input for focus control
 */
const DeviceEntryCard = ({
    index,
    total,
    value = {},
    onChange,
    onComplete,
    showSerial = false,
    isSpareProduct = false,
    imei1Ref
}) => {
    const [isOpen, setIsOpen] = useState(true);
    const [touched, setTouched] = useState({ imei_1: false, imei_2: false });
    const imei2Ref = useRef(null);

    const imei1Validation = validateIMEI(value.imei_1);
    const imei2Validation = validateIMEI(value.imei_2);

    const isComplete = value.imei_1 && imei1Validation.valid;
    const hasError = (touched.imei_1 && !imei1Validation.valid && value.imei_1) ||
        (touched.imei_2 && !imei2Validation.valid && value.imei_2);

    const handleChange = (field, fieldValue) => {
        const newValue = { ...value, [field]: fieldValue };
        onChange(index, newValue);
    };

    const handleIMEI1KeyDown = (e) => {
        if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            if (imei2Ref.current) {
                imei2Ref.current.focus();
            }
        }
    };

    const handleIMEI2KeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (isComplete && onComplete) {
                onComplete(index);
            }
        }
    };

    // Auto-collapse completed cards
    useEffect(() => {
        if (isComplete && index < total - 1) {
            // Keep current card open, let user manually collapse
        }
    }, [isComplete, index, total]);

    const getStatusBadge = () => {
        if (hasError) {
            return <Badge bg="danger">Invalid</Badge>;
        }
        if (isComplete) {
            return <Badge bg="success">✓ Complete</Badge>;
        }
        if (value.imei_1) {
            return <Badge bg="warning" text="dark">Partial</Badge>;
        }
        return <Badge bg="secondary">Empty</Badge>;
    };

    return (
        <Card className={`mb-2 ${isComplete ? 'border-success' : hasError ? 'border-danger' : ''}`}>
            <Card.Header
                className="py-2 d-flex justify-content-between align-items-center"
                style={{ cursor: 'pointer' }}
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="d-flex align-items-center">
                    <span className="me-2">{isSpareProduct ? '🔧' : '📱'}</span>
                    <strong>{isSpareProduct ? 'Part' : 'Device'} {index + 1} of {total}</strong>
                    {value.imei_1 && (
                        <code className="ms-3 text-muted small">{value.imei_1}</code>
                    )}
                </div>
                <div className="d-flex align-items-center gap-2">
                    {getStatusBadge()}
                    <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'} text-muted`}></i>
                </div>
            </Card.Header>

            <Collapse in={isOpen}>
                <Card.Body className="py-3">
                    <Row>
                        <Col md={showSerial ? 4 : 5}>
                            <Form.Group>
                                <Form.Label className="small mb-1">
                                    {isSpareProduct ? 'Serial Number' : 'IMEI 1'} <span className="text-danger">*</span>
                                </Form.Label>
                                <Form.Control
                                    ref={imei1Ref}
                                    type="text"
                                    placeholder={isSpareProduct ? 'SN12345678' : '350123456789012'}
                                    value={value.imei_1 || ''}
                                    onChange={(e) => handleChange('imei_1', e.target.value)}
                                    onBlur={() => setTouched(t => ({ ...t, imei_1: true }))}
                                    onKeyDown={handleIMEI1KeyDown}
                                    isValid={touched.imei_1 && imei1Validation.valid && value.imei_1}
                                    isInvalid={touched.imei_1 && !imei1Validation.valid && value.imei_1}
                                    maxLength={15}
                                    className="font-monospace"
                                />
                                {touched.imei_1 && !imei1Validation.valid && value.imei_1 && (
                                    <Form.Text className="text-danger small">
                                        {imei1Validation.message}
                                    </Form.Text>
                                )}
                            </Form.Group>
                        </Col>

                        {!isSpareProduct && (
                            <Col md={showSerial ? 4 : 5}>
                                <Form.Group>
                                    <Form.Label className="small mb-1">
                                        IMEI 2 <span className="text-muted">(optional)</span>
                                    </Form.Label>
                                    <Form.Control
                                        ref={imei2Ref}
                                        type="text"
                                        placeholder="350123456789013"
                                        value={value.imei_2 || ''}
                                        onChange={(e) => handleChange('imei_2', e.target.value)}
                                        onBlur={() => setTouched(t => ({ ...t, imei_2: true }))}
                                        onKeyDown={handleIMEI2KeyDown}
                                        isValid={touched.imei_2 && imei2Validation.valid && value.imei_2}
                                        isInvalid={touched.imei_2 && !imei2Validation.valid && value.imei_2}
                                        maxLength={15}
                                        className="font-monospace"
                                    />
                                    {touched.imei_2 && !imei2Validation.valid && value.imei_2 && (
                                        <Form.Text className="text-danger small">
                                            {imei2Validation.message}
                                        </Form.Text>
                                    )}
                                </Form.Group>
                            </Col>
                        )}

                        {showSerial && (
                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label className="small mb-1">Serial Number</Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="SN12345678"
                                        value={value.serial_number || ''}
                                        onChange={(e) => handleChange('serial_number', e.target.value)}
                                        className="font-monospace"
                                    />
                                </Form.Group>
                            </Col>
                        )}

                        <Col md={2}>
                            <Form.Group>
                                <Form.Label className="small mb-1">Condition</Form.Label>
                                <Form.Select
                                    size="sm"
                                    value={value.condition || 'NEW'}
                                    onChange={(e) => handleChange('condition', e.target.value)}
                                >
                                    <option value="NEW">New</option>
                                    <option value="USED">Used</option>
                                    <option value="REFURBISHED">Refurbished</option>
                                    <option value="TESTING">Testing</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                    </Row>
                </Card.Body>
            </Collapse>
        </Card>
    );
};

export default DeviceEntryCard;
export { validateIMEI };
