const express = require('express');
const router = express.Router();
const notificationService = require('../utils/notificationService');
const schedulerService = require('../utils/scheduler');
const { isAuthenticated } = require('../middleware');

// Helper function to check if user is patient
const isPatient = (req) => req.user && req.user.role === 'patient';

// Helper function to check if user is doctor
const isDoctor = (req) => req.user && req.user.role === 'doctor';

// Get user notifications (paginated)
router.get('/user/:userType', isAuthenticated, async (req, res) => {
    try {
        const { userType } = req.params;
        const { page = 1, limit = 20 } = req.query;
        const userId = req.user._id;

        // Validate user type
        if (userType !== 'patient' && userType !== 'doctor') {
            return res.status(400).json({
                success: false,
                error: 'Invalid user type. Must be "patient" or "doctor"'
            });
        }

        // Check if user has permission to access these notifications
        if (userType === 'patient' && !isPatient(req)) {
            return res.status(403).json({
                success: false,
                error: 'Access denied. Only patients can access patient notifications.'
            });
        }

        if (userType === 'doctor' && !isDoctor(req)) {
            return res.status(403).json({
                success: false,
                error: 'Access denied. Only doctors can access doctor notifications.'
            });
        }

        const result = await notificationService.getUserNotifications(
            userId,
            userType,
            parseInt(limit),
            parseInt(page)
        );

        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }

    } catch (error) {
        console.error('Error getting user notifications:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// Mark notification as read
router.patch('/:notificationId/read', isAuthenticated, async (req, res) => {
    try {
        const { notificationId } = req.params;
        const userId = req.user._id;

        const result = await notificationService.markNotificationAsRead(notificationId, userId);

        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }

    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// Mark all notifications as read
router.patch('/mark-all-read/:userType', isAuthenticated, async (req, res) => {
    try {
        const { userType } = req.params;
        const userId = req.user._id;

        // Validate user type
        if (userType !== 'patient' && userType !== 'doctor') {
            return res.status(400).json({
                success: false,
                error: 'Invalid user type. Must be "patient" or "doctor"'
            });
        }

        // Check if user has permission
        if (userType === 'patient' && !isPatient(req)) {
            return res.status(403).json({
                success: false,
                error: 'Access denied. Only patients can access patient notifications.'
            });
        }

        if (userType === 'doctor' && !isDoctor(req)) {
            return res.status(403).json({
                success: false,
                error: 'Access denied. Only doctors can access doctor notifications.'
            });
        }

        const result = await notificationService.markAllNotificationsAsRead(userId, userType);

        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }

    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// Get unread notification count
router.get('/unread-count/:userType', isAuthenticated, async (req, res) => {
    try {
        const { userType } = req.params;
        const userId = req.user._id;

        // Validate user type
        if (userType !== 'patient' && userType !== 'doctor') {
            return res.status(400).json({
                success: false,
                error: 'Invalid user type. Must be "patient" or "doctor"'
            });
        }

        // Check if user has permission
        if (userType === 'patient' && !isPatient(req)) {
            return res.status(403).json({
                success: false,
                error: 'Access denied. Only patients can access patient notifications.'
            });
        }

        if (userType === 'doctor' && !isDoctor(req)) {
            return res.status(403).json({
                success: false,
                error: 'Access denied. Only doctors can access doctor notifications.'
            });
        }

        const Notification = require('../models/notification');
        const count = await Notification.countDocuments({
            recipient: userId,
            recipientModel: userType === 'doctor' ? 'Doctor' : 'Patient',
            read: false
        });

        res.json({
            success: true,
            unreadCount: count
        });

    } catch (error) {
        console.error('Error getting unread count:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// Delete notification
router.delete('/:notificationId', isAuthenticated, async (req, res) => {
    try {
        const { notificationId } = req.params;
        const userId = req.user._id;

        const Notification = require('../models/notification');
        const notification = await Notification.findOneAndDelete({
            _id: notificationId,
            recipient: userId
        });

        if (!notification) {
            return res.status(404).json({
                success: false,
                error: 'Notification not found'
            });
        }

        res.json({
            success: true,
            message: 'Notification deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// Get notification statistics
router.get('/stats/:userType', isAuthenticated, async (req, res) => {
    try {
        const { userType } = req.params;
        const userId = req.user._id;

        // Validate user type
        if (userType !== 'patient' && userType !== 'doctor') {
            return res.status(400).json({
                success: false,
                error: 'Invalid user type. Must be "patient" or "doctor"'
            });
        }

        // Check if user has permission
        if (userType === 'patient' && !isPatient(req)) {
            return res.status(403).json({
                success: false,
                error: 'Access denied. Only patients can access patient notifications.'
            });
        }

        if (userType === 'doctor' && !isDoctor(req)) {
            return res.status(403).json({
                success: false,
                error: 'Access denied. Only doctors can access doctor notifications.'
            });
        }

        const Notification = require('../models/notification');
        
        // Get total notifications
        const total = await Notification.countDocuments({
            recipient: userId,
            recipientModel: userType === 'doctor' ? 'Doctor' : 'Patient'
        });

        // Get unread notifications
        const unread = await Notification.countDocuments({
            recipient: userId,
            recipientModel: userType === 'doctor' ? 'Doctor' : 'Patient',
            read: false
        });

        // Get notifications by type
        const typeStats = await Notification.aggregate([
            {
                $match: {
                    recipient: userId,
                    recipientModel: userType === 'doctor' ? 'Doctor' : 'Patient'
                }
            },
            {
                $group: {
                    _id: '$type',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Get recent notifications (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recent = await Notification.countDocuments({
            recipient: userId,
            recipientModel: userType === 'doctor' ? 'Doctor' : 'Patient',
            createdAt: { $gte: sevenDaysAgo }
        });

        res.json({
            success: true,
            stats: {
                total,
                unread,
                recent,
                typeBreakdown: typeStats
            }
        });

    } catch (error) {
        console.error('Error getting notification stats:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// Admin routes for managing notifications
router.get('/admin/scheduler/status', isAuthenticated, (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Access denied. Admin privileges required.'
            });
        }

        const status = schedulerService.getJobStatus();
        res.json({
            success: true,
            schedulerStatus: status
        });

    } catch (error) {
        console.error('Error getting scheduler status:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// Manually trigger daily reminders (admin only)
router.post('/admin/trigger-daily-reminders', isAuthenticated, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Access denied. Admin privileges required.'
            });
        }

        const result = await schedulerService.triggerDailyReminders();
        res.json(result);

    } catch (error) {
        console.error('Error triggering daily reminders:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// Manually trigger cleanup (admin only)
router.post('/admin/trigger-cleanup', isAuthenticated, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Access denied. Admin privileges required.'
            });
        }

        const result = await schedulerService.triggerCleanup();
        res.json(result);

    } catch (error) {
        console.error('Error triggering cleanup:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// Start/stop scheduler jobs (admin only)
router.post('/admin/scheduler/:action', isAuthenticated, (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Access denied. Admin privileges required.'
            });
        }

        const { action } = req.params;

        switch (action) {
            case 'start':
                schedulerService.startAllJobs();
                res.json({
                    success: true,
                    message: 'All scheduler jobs started successfully'
                });
                break;

            case 'stop':
                schedulerService.stopAllJobs();
                res.json({
                    success: true,
                    message: 'All scheduler jobs stopped successfully'
                });
                break;

            default:
                res.status(400).json({
                    success: false,
                    error: 'Invalid action. Use "start" or "stop"'
                });
        }

    } catch (error) {
        console.error('Error managing scheduler:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

module.exports = router;
