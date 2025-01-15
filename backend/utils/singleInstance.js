const net = require('net');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PID_FILE = path.join(__dirname, '../.server.pid');

/**
 * Check if a port is already in use
 */
async function isPortInUse(port) {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.once('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                resolve(true);
            } else {
                resolve(false);
            }
        });
        server.once('listening', () => {
            server.close();
            resolve(false);
        });
        server.listen(port);
    });
}

/**
 * Kill process using a specific port
 */
async function killProcessOnPort(port) {
    return new Promise((resolve) => {
        exec(`lsof -ti :${port}`, (error, stdout) => {
            if (error || !stdout.trim()) {
                resolve(false);
                return;
            }

            const pids = stdout.trim().split('\n').filter(Boolean);
            console.info(`💀 Killing existing process(es) on port ${port}: PID ${pids.join(', ')}`);

            pids.forEach(pid => {
                try {
                    process.kill(parseInt(pid, 10), 'SIGTERM');
                } catch (_e) {
                    // Ignored
                }
            });

            setTimeout(() => {
                pids.forEach(pid => {
                    try {
                        process.kill(parseInt(pid, 10), 'SIGKILL');
                    } catch (_e) {
                        // Ignored
                    }
                });
                resolve(true);
            }, 2000);
        });
    });
}

function writePidFile() {
    try {
        // RC-15: Use exclusive flag to prevent concurrent PID file overwrite
        fs.writeFileSync(PID_FILE, process.pid.toString(), { encoding: 'utf8', flag: 'wx' });
        console.info(`💾 PID file created: ${PID_FILE} (PID: ${process.pid})`);
    } catch (error) {
        if (error.code === 'EEXIST') {
            // PID file exists — overwrite with our PID since we've already killed the old process
            fs.writeFileSync(PID_FILE, process.pid.toString(), 'utf8');
            console.info(`💾 PID file overwritten: ${PID_FILE} (PID: ${process.pid})`);
        } else {
            console.warn('⚠️  Could not write PID file:', error.message);
        }
    }
}

function removePidFile() {
    try {
        if (fs.existsSync(PID_FILE)) {
            fs.unlinkSync(PID_FILE);
            console.info('🗑️  PID file removed');
        }
    } catch (error) {
        console.warn('⚠️  Could not remove PID file:', error.message);
    }
}

async function ensureSingleInstance(port) {
    const portInUse = await isPortInUse(port);

    if (portInUse) {
        console.info(`⚠️  Port ${port} is already in use!`);
        if (fs.existsSync(PID_FILE)) {
            const existingPid = fs.readFileSync(PID_FILE, 'utf8').trim();
            console.info(`📋 Existing server PID from file: ${existingPid}`);
        }

        console.info('🔄 Killing existing server instance and taking over...');
        await killProcessOnPort(port);
        await new Promise(resolve => setTimeout(resolve, 1000));

        const stillInUse = await isPortInUse(port);
        if (stillInUse) {
            console.error(`❌ Failed to free port ${port}. Please manually stop the existing server.`);
            process.exit(1);
        }
        console.info(`✅ Port ${port} is now free`);
    }

    writePidFile();
}

module.exports = {
    ensureSingleInstance,
    removePidFile
};
