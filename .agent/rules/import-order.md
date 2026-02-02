---
trigger: always_on
---

# Import Order Convention

## Backend (Node.js/CommonJS)

```javascript
// 1. Built-in Node.js modules
const path = require('path');
const fs = require('fs');

// 2. External npm packages
const express = require('express');
const mongoose = require('mongoose');

// 3. Internal config/utils
const { connectMongoDB } = require('../config/mongodb');
const SanitizationService = require('../services/SanitizationService');

// 4. Models
const User = require('../models/User');
const Role = require('../models/Role');

// 5. Services
const InventoryService = require('../services/InventoryService');

// 6. Middleware
const { checkPermission } = require('../middleware/rbac');
```

## Frontend (React/ES Modules)

```jsx
// 1. React and React-related
import React, { useState, useEffect, useCallback } from 'react';

// 2. External packages
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import toast from 'react-hot-toast';

// 3. Internal services
import InventoryService from '../../services/inventoryService';

// 4. Internal contexts
import { useAuth } from '../../contexts/AuthContext';

// 5. Internal components
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ConfirmModal from '../../components/ui/ConfirmModal';

// 6. Shared utilities/constants
import { PERMISSIONS } from '../../../shared/permissions.cjs';
```

## Blank Line Rules

- One blank line between import groups
- Two blank lines before class/function definitions
