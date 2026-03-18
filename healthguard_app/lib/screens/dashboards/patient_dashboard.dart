import 'package:flutter/material.dart';
import '../../services/api_service.dart';
import '../../theme/app_theme.dart';

class PatientDashboard extends StatefulWidget {
  final String? userId;
  final String? token;

  const PatientDashboard({super.key, this.userId, this.token});

  @override
  State<PatientDashboard> createState() => _PatientDashboardState();
}

class _PatientDashboardState extends State<PatientDashboard> {
  Map<String, dynamic>? _patientData;
  List<dynamic> _doctors = [];
  List<dynamic> _familyMembers = [];
  List<dynamic> _filteredDoctors = [];
  List<dynamic> _filteredFamilyMembers = [];
  bool _isLoading = true;
  String? _errorMessage;
  int _selectedTabIndex = 0;

  late TextEditingController _doctorSearchController;
  late TextEditingController _familySearchController;

  @override
  void initState() {
    super.initState();
    _doctorSearchController = TextEditingController();
    _familySearchController = TextEditingController();
    _doctorSearchController.addListener(_filterDoctors);
    _familySearchController.addListener(_filterFamilyMembers);
    _loadDashboardData();
  }

  @override
  void dispose() {
    _doctorSearchController.dispose();
    _familySearchController.dispose();
    super.dispose();
  }

  void _loadDashboardData() async {
    if (widget.userId == null || widget.token == null) {
      setState(() {
        _errorMessage = 'Missing user ID or token';
        _isLoading = false;
      });
      return;
    }

    try {
      // Load patient profile
      final profileData = await ApiService.getPatientProfile(
        userId: widget.userId!,
        token: widget.token!,
      );

      // Load doctors list
      print('Loading doctors list...');
      final doctorsData = await ApiService.getDoctors(token: widget.token!);
      print('Doctors data received: $doctorsData');
      print('Total doctors: ${doctorsData['total_doctors']}');

      // Load family members
      final familyData = await ApiService.getFamilyMembers(
        token: widget.token!,
      );

      final doctors = doctorsData['doctors'] ?? [];
      print('Doctors list populated: ${doctors.length} doctors');

      setState(() {
        _patientData = profileData['patient'];
        _doctors = doctors;
        _familyMembers = familyData['family_members'] ?? [];
        _filteredDoctors = _doctors;
        _filteredFamilyMembers = _familyMembers;
        _isLoading = false;
      });
    } catch (e) {
      print('Error loading dashboard data: $e');
      setState(() {
        _errorMessage = e.toString();
        _isLoading = false;
      });
    }
  }

  void _filterDoctors() {
    final query = _doctorSearchController.text.toLowerCase();
    setState(() {
      if (query.isEmpty) {
        _filteredDoctors = _doctors;
      } else {
        _filteredDoctors =
            _doctors.where((doctor) {
              final name = doctor['full_name']?.toString().toLowerCase() ?? '';
              final phone =
                  doctor['phone_number']?.toString().toLowerCase() ?? '';
              final specialization =
                  doctor['specialization']?.toString().toLowerCase() ?? '';
              final hospital =
                  doctor['hospital_clinic']?.toString().toLowerCase() ?? '';

              return name.contains(query) ||
                  phone.contains(query) ||
                  specialization.contains(query) ||
                  hospital.contains(query);
            }).toList();
      }
    });
  }

  void _filterFamilyMembers() {
    final query = _familySearchController.text.toLowerCase();
    setState(() {
      _filteredFamilyMembers =
          _familyMembers.where((member) {
            final name = member['full_name']?.toString().toLowerCase() ?? '';
            final relationship =
                member['relationship']?.toString().toLowerCase() ?? '';
            return name.contains(query) || relationship.contains(query);
          }).toList();
    });
  }

  void _logout() {
    showDialog(
      context: context,
      builder:
          (BuildContext context) => AlertDialog(
            title: const Text('Logout?'),
            content: const Text('Are you sure you want to logout?'),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Cancel'),
              ),
              TextButton(
                onPressed: () {
                  Navigator.pop(context);
                  ApiService.logout();
                  Navigator.pushReplacementNamed(context, '/login');
                },
                child: const Text(
                  'Logout',
                  style: TextStyle(color: AppTheme.accentColor),
                ),
              ),
            ],
          ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Health Dashboard'),
        elevation: 0,
        actions: [
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: IconButton(
              icon: const Icon(Icons.logout),
              onPressed: _logout,
              tooltip: 'Logout',
            ),
          ),
        ],
      ),
      body:
          _isLoading
              ? const Center(child: CircularProgressIndicator())
              : _errorMessage != null
              ? Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(
                      Icons.error_outline,
                      size: 64,
                      color: AppTheme.accentColor,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Error: $_errorMessage',
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: AppTheme.accentColor),
                    ),
                    const SizedBox(height: 24),
                    ElevatedButton(
                      onPressed: _loadDashboardData,
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              )
              : SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Hero Section with Avatar & Status
                    _buildHeroSection(),

                    // Quick Action Cards
                    _buildQuickStatsSection(),

                    // Health Status & Alerts
                    _buildHealthStatusCard(),

                    // Tabs for Detailed Views
                    Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Manage Your Health',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: AppTheme.textPrimaryColor,
                            ),
                          ),
                          const SizedBox(height: 12),
                          _buildTabBar(),
                          const SizedBox(height: 16),
                          if (_selectedTabIndex == 0) _buildProfileTab(),
                          if (_selectedTabIndex == 1) _buildDoctorTab(),
                          if (_selectedTabIndex == 2) _buildFamilyTab(),
                          if (_selectedTabIndex == 3) _buildAccountTab(),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
    );
  }

  Widget _buildHeroSection() {
    final initials =
        (_patientData?['full_name'] ?? 'P')
            .split(' ')
            .map((e) => e.isNotEmpty ? e[0] : '')
            .join()
            .toUpperCase();

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [AppTheme.primaryColor, AppTheme.accentColor],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 16),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Avatar
              CircleAvatar(
                radius: 40,
                backgroundColor: Colors.white.withOpacity(0.3),
                child: Text(
                  initials,
                  style: const TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
              ),
              const SizedBox(width: 16),
              // Greeting & Status
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Hello, ${_patientData?['full_name']?.split(' ')[0] ?? 'Patient'}! 👋',
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.favorite,
                            color: Colors.redAccent,
                            size: 14,
                          ),
                          SizedBox(width: 6),
                          Text(
                            'Healthy Status',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          // Quick Info
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Medical Condition',
                      style: TextStyle(color: Colors.white70, fontSize: 12),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _patientData?['medical_condition'] ?? 'None',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Age',
                      style: TextStyle(color: Colors.white70, fontSize: 12),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${_patientData?['age'] ?? 'N/A'} years',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildQuickStatsSection() {
    final assignedDoctor = _patientData?['doctor'];

    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        children: [
          Row(
            children: [
              // Doctor Status Card
              Expanded(
                child: _buildStatCard(
                  icon: Icons.medical_services,
                  title: 'Doctor',
                  value: assignedDoctor?['full_name'] ?? 'Not Assigned',
                  color: AppTheme.accentColor,
                  onTap: () => setState(() => _selectedTabIndex = 1),
                ),
              ),
              const SizedBox(width: 12),
              // Family Members Card
              Expanded(
                child: _buildStatCard(
                  icon: Icons.group,
                  title: 'Family',
                  value: '${_familyMembers.length} members',
                  color: AppTheme.primaryColor,
                  onTap: () => setState(() => _selectedTabIndex = 2),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatCard({
    required IconData icon,
    required String title,
    required String value,
    required Color color,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          border: Border.all(color: color.withOpacity(0.3)),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: color.withOpacity(0.2),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, color: color, size: 24),
            ),
            const SizedBox(height: 12),
            Text(
              title,
              style: const TextStyle(
                fontSize: 12,
                color: AppTheme.textSecondaryColor,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              value,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: AppTheme.textPrimaryColor,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHealthStatusCard() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.green.withOpacity(0.1),
          border: Border.all(color: Colors.green, width: 2),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.green.withOpacity(0.2),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(
                Icons.check_circle,
                color: Colors.green,
                size: 28,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Your Health is Good',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.textPrimaryColor,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'All vitals are within normal range',
                    style: TextStyle(
                      fontSize: 12,
                      color: AppTheme.textSecondaryColor,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTabBar() {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          _buildTabButton(0, 'Profile', Icons.person),
          _buildTabButton(1, 'Doctor', Icons.medical_services),
          _buildTabButton(2, 'Family', Icons.group),
          _buildTabButton(3, 'Account', Icons.settings),
        ],
      ),
    );
  }

  Widget _buildTabButton(int index, String label, IconData icon) {
    final isSelected = _selectedTabIndex == index;
    return Padding(
      padding: const EdgeInsets.only(right: 8.0),
      child: FilterChip(
        selected: isSelected,
        label: Row(
          children: [
            Icon(icon, size: 16),
            const SizedBox(width: 6),
            Text(label),
          ],
        ),
        onSelected: (_) {
          setState(() => _selectedTabIndex = index);
        },
        backgroundColor: Colors.white,
        selectedColor: AppTheme.primaryColor,
        labelStyle: TextStyle(
          color: isSelected ? Colors.white : AppTheme.textPrimaryColor,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  Widget _buildProfileTab() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Profile Card
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            border: Border.all(color: AppTheme.dividerColor(1.0)),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Your Profile',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.textPrimaryColor,
                ),
              ),
              const SizedBox(height: 16),
              _buildProfileField('Name', _patientData?['full_name'] ?? 'N/A'),
              _buildProfileField('Email', _patientData?['email'] ?? 'N/A'),
              _buildProfileField(
                'Phone',
                _patientData?['phone_number'] ?? 'N/A',
              ),
              _buildProfileField(
                'Age',
                '${_patientData?['age'] ?? 'N/A'} years',
              ),
              _buildProfileField(
                'Medical Condition',
                _patientData?['medical_condition'] ?? 'None',
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildProfileField(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              color: AppTheme.textSecondaryColor,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: const TextStyle(
              fontSize: 14,
              color: AppTheme.textPrimaryColor,
              fontWeight: FontWeight.w500,
            ),
          ),
          if (label != 'Medical Condition')
            Divider(color: AppTheme.dividerColor(1.0), height: 12),
        ],
      ),
    );
  }

  Widget _buildDoctorTab() {
    final assignedDoctor = _patientData?['doctor'];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Current Doctor
        if (assignedDoctor != null)
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppTheme.accentColor.withOpacity(0.1),
              border: Border.all(color: AppTheme.accentColor),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Your Assigned Doctor',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.textPrimaryColor,
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Container(
                      width: 50,
                      height: 50,
                      decoration: BoxDecoration(
                        color: AppTheme.primaryColor,
                        borderRadius: BorderRadius.circular(25),
                      ),
                      child: const Icon(Icons.person, color: Colors.white),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            assignedDoctor['full_name'] ?? 'Doctor',
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: AppTheme.textPrimaryColor,
                            ),
                          ),
                          Text(
                            '${assignedDoctor['specialization'] ?? 'General Practitioner'}',
                            style: const TextStyle(
                              fontSize: 11,
                              color: AppTheme.textSecondaryColor,
                            ),
                          ),
                          Text(
                            assignedDoctor['phone_number'] ?? 'N/A',
                            style: const TextStyle(
                              fontSize: 11,
                              color: AppTheme.textSecondaryColor,
                            ),
                          ),
                          Text(
                            assignedDoctor['hospital_clinic'] ?? 'N/A',
                            style: const TextStyle(
                              fontSize: 10,
                              color: AppTheme.textSecondaryColor,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                    ElevatedButton(
                      onPressed: () => _removeDoctor(),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.accentColor,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 8,
                        ),
                      ),
                      child: const Text(
                        'Change',
                        style: TextStyle(fontSize: 11),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          )
        else
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.orange.withOpacity(0.1),
              border: Border.all(color: Colors.orange),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'No Doctor Assigned',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.textPrimaryColor,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Please assign a doctor from the search below',
                  style: TextStyle(
                    fontSize: 12,
                    color: AppTheme.textSecondaryColor,
                  ),
                ),
              ],
            ),
          ),
        const SizedBox(height: 24),

        // Search Doctors
        TextField(
          controller: _doctorSearchController,
          decoration: InputDecoration(
            hintText: 'Search doctor by name or phone',
            prefixIcon: const Icon(Icons.search),
            suffixIcon:
                _doctorSearchController.text.isNotEmpty
                    ? IconButton(
                      icon: const Icon(Icons.clear),
                      onPressed: () {
                        _doctorSearchController.clear();
                        _filterDoctors();
                      },
                    )
                    : null,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 12,
              vertical: 10,
            ),
          ),
          onChanged: (_) => _filterDoctors(),
        ),
        const SizedBox(height: 16),

        // Doctor List
        const Text(
          'Available Doctors',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: AppTheme.textPrimaryColor,
          ),
        ),
        const SizedBox(height: 12),
        if (_filteredDoctors.isEmpty)
          Center(
            child: Padding(
              padding: const EdgeInsets.all(20.0),
              child: Column(
                children: [
                  Icon(
                    Icons.people_outline,
                    size: 48,
                    color: AppTheme.textSecondaryColor,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _doctors.isEmpty
                        ? 'No doctors available'
                        : 'No doctors matching "${_doctorSearchController.text}"',
                    style: const TextStyle(color: AppTheme.textSecondaryColor),
                  ),
                  if (_doctors.isEmpty)
                    Column(
                      children: [
                        const SizedBox(height: 12),
                        const Text(
                          'Please try refreshing or check internet connection',
                          style: TextStyle(
                            fontSize: 10,
                            color: AppTheme.textSecondaryColor,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 12),
                        ElevatedButton(
                          onPressed: _loadDashboardData,
                          child: const Text('Refresh'),
                        ),
                      ],
                    ),
                ],
              ),
            ),
          )
        else
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _filteredDoctors.length,
            itemBuilder: (context, index) {
              final doctor = _filteredDoctors[index];
              final isAssigned =
                  assignedDoctor?['user_id'] == doctor['user_id'];

              return Card(
                margin: const EdgeInsets.only(bottom: 12),
                child: ListTile(
                  leading: Container(
                    width: 45,
                    height: 45,
                    decoration: BoxDecoration(
                      color:
                          isAssigned
                              ? AppTheme.primaryColor
                              : AppTheme.accentColor,
                      borderRadius: BorderRadius.circular(22),
                    ),
                    child: Icon(
                      isAssigned ? Icons.check : Icons.medical_services,
                      color: Colors.white,
                      size: 20,
                    ),
                  ),
                  title: Text(
                    doctor['full_name'] ?? 'Doctor',
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                  subtitle: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        doctor['phone_number'] ?? 'N/A',
                        style: const TextStyle(fontSize: 11),
                      ),
                      Text(
                        '${doctor['specialization'] ?? 'General Practitioner'} • ${doctor['hospital_clinic'] ?? 'N/A'}',
                        style: const TextStyle(
                          fontSize: 10,
                          color: AppTheme.textSecondaryColor,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                  trailing:
                      isAssigned
                          ? const Chip(
                            label: Text('Assigned'),
                            backgroundColor: AppTheme.primaryColor,
                          )
                          : ElevatedButton(
                            onPressed: () => _assignDoctor(doctor),
                            style: ElevatedButton.styleFrom(
                              padding: EdgeInsets.zero,
                            ),
                            child: const Text(
                              'Assign',
                              style: TextStyle(fontSize: 12),
                            ),
                          ),
                ),
              );
            },
          ),
      ],
    );
  }

  void _assignDoctor(dynamic doctor) {
    showDialog(
      context: context,
      builder:
          (BuildContext context) => AlertDialog(
            title: const Text('Assign Doctor?'),
            content: Text('Assign ${doctor['full_name']} as your doctor?'),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Cancel'),
              ),
              TextButton(
                onPressed: () async {
                  Navigator.pop(context);
                  try {
                    final patientId =
                        _patientData?['patient_id']?.toString() ??
                        widget.userId!;
                    print(
                      'Using patient_id: $patientId, doctor user_id: ${doctor['user_id']}',
                    );

                    await ApiService.assignDoctor(
                      patientId: patientId,
                      doctorId: doctor['user_id'].toString(),
                      token: widget.token!,
                    );

                    // Reload dashboard to show updated doctor assignment
                    if (mounted) {
                      _loadDashboardData();
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(
                            'Doctor ${doctor['full_name']} assigned successfully',
                          ),
                          backgroundColor: AppTheme.primaryColor,
                        ),
                      );
                    }
                  } catch (e) {
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('Error: $e'),
                          backgroundColor: AppTheme.accentColor,
                        ),
                      );
                    }
                  }
                },
                child: const Text('Assign'),
              ),
            ],
          ),
    );
  }

  void _removeDoctor() {
    showDialog(
      context: context,
      builder:
          (BuildContext context) => AlertDialog(
            title: const Text('Change Doctor?'),
            content: const Text(
              'Remove your current doctor assignment? You can assign a new one.',
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Cancel'),
              ),
              TextButton(
                onPressed: () async {
                  Navigator.pop(context);
                  try {
                    await ApiService.removeDoctor(token: widget.token!);
                    _loadDashboardData();
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Doctor assignment removed'),
                        backgroundColor: AppTheme.primaryColor,
                      ),
                    );
                  } catch (e) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('Error: $e'),
                        backgroundColor: AppTheme.accentColor,
                      ),
                    );
                  }
                },
                child: const Text(
                  'Remove',
                  style: TextStyle(color: AppTheme.accentColor),
                ),
              ),
            ],
          ),
    );
  }

  Widget _buildFamilyTab() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Family Members',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: AppTheme.textPrimaryColor,
          ),
        ),
        const SizedBox(height: 16),

        // Search Family Members
        TextField(
          controller: _familySearchController,
          decoration: InputDecoration(
            hintText: 'Search family member by name or relationship',
            prefixIcon: const Icon(Icons.search),
            suffixIcon:
                _familySearchController.text.isNotEmpty
                    ? IconButton(
                      icon: const Icon(Icons.clear),
                      onPressed: () {
                        _familySearchController.clear();
                        _filterFamilyMembers();
                      },
                    )
                    : null,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 12,
              vertical: 10,
            ),
          ),
          onChanged: (_) => _filterFamilyMembers(),
        ),
        const SizedBox(height: 16),

        if (_familyMembers.isEmpty)
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.grey.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Column(
              children: [
                Icon(
                  Icons.people_outline,
                  size: 48,
                  color: AppTheme.textSecondaryColor,
                ),
                const SizedBox(height: 8),
                const Text(
                  'No family members assigned yet',
                  style: TextStyle(color: AppTheme.textSecondaryColor),
                ),
                const SizedBox(height: 12),
                ElevatedButton(
                  onPressed: () => _showAddFamilyDialog(),
                  child: const Text('Add Family Member'),
                ),
              ],
            ),
          )
        else if (_filteredFamilyMembers.isEmpty)
          Center(
            child: Padding(
              padding: const EdgeInsets.all(20.0),
              child: Column(
                children: [
                  Icon(
                    Icons.people_outline,
                    size: 48,
                    color: AppTheme.textSecondaryColor,
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'No family members found',
                    style: TextStyle(color: AppTheme.textSecondaryColor),
                  ),
                ],
              ),
            ),
          )
        else
          Column(
            children: [
              ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _filteredFamilyMembers.length,
                itemBuilder: (context, index) {
                  final member = _filteredFamilyMembers[index];
                  return Card(
                    margin: const EdgeInsets.only(bottom: 12),
                    child: ListTile(
                      leading: Container(
                        width: 45,
                        height: 45,
                        decoration: BoxDecoration(
                          color: AppTheme.primaryColor,
                          borderRadius: BorderRadius.circular(22),
                        ),
                        child: const Icon(Icons.person, color: Colors.white),
                      ),
                      title: Text(
                        member['full_name'] ?? 'Family Member',
                        style: const TextStyle(fontWeight: FontWeight.w600),
                      ),
                      subtitle: Text(member['relationship'] ?? 'Relation'),
                      trailing: IconButton(
                        icon: const Icon(
                          Icons.delete,
                          color: AppTheme.accentColor,
                        ),
                        onPressed: () => _removeFamilyMember(member),
                        tooltip: 'Remove',
                      ),
                    ),
                  );
                },
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => _showAddFamilyDialog(),
                  child: const Text('Add Family Member'),
                ),
              ),
            ],
          ),
      ],
    );
  }

  void _showAddFamilyDialog() {
    final relationships = [
      'sibling',
      'mother',
      'father',
      'child',
      'spouse',
      'grandparent',
      'grandchild',
      'aunt',
      'uncle',
      'cousin',
      'other',
    ];

    String? selectedFamilyMemberId;
    String? selectedRelationship = 'sibling';
    final searchController = TextEditingController();
    List<dynamic> allUnassignedMembers = [];
    List<dynamic> filteredMembers = [];
    bool isLoadingMembers = true;
    String? loadError;

    showDialog(
      context: context,
      builder:
          (BuildContext context) => StatefulBuilder(
            builder: (context, setState) {
              // Load unassigned members only once
              if (isLoadingMembers &&
                  allUnassignedMembers.isEmpty &&
                  loadError == null) {
                ApiService.getUnassignedFamilyMembers(token: widget.token!)
                    .then((data) {
                      setState(() {
                        allUnassignedMembers = data['family_members'] ?? [];
                        isLoadingMembers = false;
                      });
                    })
                    .catchError((e) {
                      setState(() {
                        loadError = e.toString();
                        isLoadingMembers = false;
                      });
                    });
              }

              return AlertDialog(
                title: const Text('Add Family Member'),
                content: SizedBox(
                  width: double.maxFinite,
                  child: SingleChildScrollView(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Search Field
                        TextField(
                          controller: searchController,
                          decoration: InputDecoration(
                            labelText: 'Search family members',
                            hintText: 'Type name to search',
                            prefixIcon: const Icon(Icons.search),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                          onChanged: (value) {
                            setState(() {
                              final query = value.toLowerCase();
                              if (query.isEmpty) {
                                filteredMembers = [];
                              } else {
                                filteredMembers =
                                    allUnassignedMembers.where((member) {
                                      final name =
                                          member['full_name']
                                              ?.toString()
                                              .toLowerCase() ??
                                          '';
                                      final phone =
                                          member['phone_number']
                                              ?.toString()
                                              .toLowerCase() ??
                                          '';
                                      final email =
                                          member['email']
                                              ?.toString()
                                              .toLowerCase() ??
                                          '';
                                      return name.contains(query) ||
                                          phone.contains(query) ||
                                          email.contains(query);
                                    }).toList();
                              }
                            });
                          },
                        ),
                        const SizedBox(height: 16),

                        // Loading State (while fetching all members)
                        if (isLoadingMembers && searchController.text.isEmpty)
                          const Center(
                            child: Padding(
                              padding: EdgeInsets.all(20.0),
                              child: Text(
                                'Ready to search...',
                                style: TextStyle(
                                  color: AppTheme.textSecondaryColor,
                                ),
                              ),
                            ),
                          )
                        // Error State
                        else if (loadError != null)
                          Center(
                            child: Padding(
                              padding: const EdgeInsets.all(20.0),
                              child: Column(
                                children: [
                                  Icon(
                                    Icons.error_outline,
                                    size: 40,
                                    color: AppTheme.accentColor,
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    'Error loading members: $loadError',
                                    style: const TextStyle(
                                      color: AppTheme.accentColor,
                                    ),
                                    textAlign: TextAlign.center,
                                  ),
                                ],
                              ),
                            ),
                          )
                        // Empty search state
                        else if (searchController.text.isEmpty &&
                            !isLoadingMembers)
                          Center(
                            child: Padding(
                              padding: const EdgeInsets.all(20.0),
                              child: Column(
                                children: [
                                  Icon(
                                    Icons.search,
                                    size: 40,
                                    color: AppTheme.textSecondaryColor,
                                  ),
                                  const SizedBox(height: 8),
                                  const Text(
                                    'Search for a family member by name',
                                    style: TextStyle(
                                      color: AppTheme.textSecondaryColor,
                                    ),
                                    textAlign: TextAlign.center,
                                  ),
                                ],
                              ),
                            ),
                          )
                        // No results found
                        else if (filteredMembers.isEmpty &&
                            searchController.text.isNotEmpty)
                          Center(
                            child: Padding(
                              padding: const EdgeInsets.all(20.0),
                              child: Column(
                                children: [
                                  Icon(
                                    Icons.person_off,
                                    size: 40,
                                    color: AppTheme.textSecondaryColor,
                                  ),
                                  const SizedBox(height: 8),
                                  const Text(
                                    'No family members found',
                                    style: TextStyle(
                                      color: AppTheme.textSecondaryColor,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          )
                        // Family Members List (only show if search has results)
                        else if (filteredMembers.isNotEmpty)
                          Container(
                            constraints: const BoxConstraints(maxHeight: 200),
                            decoration: BoxDecoration(
                              border: Border.all(
                                color: AppTheme.dividerColor(1.0),
                              ),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: ListView.builder(
                              shrinkWrap: true,
                              itemCount: filteredMembers.length,
                              itemBuilder: (context, index) {
                                final member = filteredMembers[index];
                                final isSelected =
                                    selectedFamilyMemberId ==
                                    member['user_id'].toString();

                                return GestureDetector(
                                  onTap: () {
                                    setState(() {
                                      selectedFamilyMemberId =
                                          member['user_id'].toString();
                                    });
                                  },
                                  child: Container(
                                    padding: const EdgeInsets.all(12),
                                    decoration: BoxDecoration(
                                      color:
                                          isSelected
                                              ? AppTheme.primaryColor
                                                  .withOpacity(0.1)
                                              : Colors.transparent,
                                      border: Border(
                                        bottom: BorderSide(
                                          color: AppTheme.dividerColor(0.5),
                                        ),
                                      ),
                                    ),
                                    child: Row(
                                      children: [
                                        isSelected
                                            ? const Icon(
                                              Icons.check_circle,
                                              color: AppTheme.primaryColor,
                                            )
                                            : Icon(
                                              Icons.radio_button_unchecked,
                                              color: AppTheme.dividerColor(1.0),
                                            ),
                                        const SizedBox(width: 12),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                member['full_name'] ??
                                                    'Unknown',
                                                style: const TextStyle(
                                                  fontWeight: FontWeight.w600,
                                                  color:
                                                      AppTheme.textPrimaryColor,
                                                ),
                                              ),
                                              Text(
                                                member['email'] ?? '',
                                                style: const TextStyle(
                                                  fontSize: 12,
                                                  color:
                                                      AppTheme
                                                          .textSecondaryColor,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                );
                              },
                            ),
                          ),
                        const SizedBox(height: 16),

                        // Relationship Selection
                        if (selectedFamilyMemberId != null) ...[
                          const Text(
                            'Select relationship:',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: AppTheme.textPrimaryColor,
                            ),
                          ),
                          const SizedBox(height: 8),
                          DropdownButton<String>(
                            value: selectedRelationship,
                            isExpanded: true,
                            items:
                                relationships.map((String value) {
                                  return DropdownMenuItem<String>(
                                    value: value,
                                    child: Text(value.toUpperCase()),
                                  );
                                }).toList(),
                            onChanged: (String? newValue) {
                              if (newValue != null) {
                                setState(() {
                                  selectedRelationship = newValue;
                                });
                              }
                            },
                          ),
                        ] else
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.grey.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Row(
                              children: [
                                Icon(
                                  Icons.info_outline,
                                  color: AppTheme.textSecondaryColor,
                                  size: 18,
                                ),
                                SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    'Search and select a family member first',
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: AppTheme.textSecondaryColor,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
                actions: [
                  TextButton(
                    onPressed: () {
                      searchController.dispose();
                      Navigator.pop(context);
                    },
                    child: const Text('Cancel'),
                  ),
                  TextButton(
                    onPressed:
                        selectedFamilyMemberId == null
                            ? null
                            : () async {
                              try {
                                Navigator.pop(context);

                                ScaffoldMessenger.of(this.context).showSnackBar(
                                  const SnackBar(
                                    content: Text('Adding family member...'),
                                  ),
                                );

                                await ApiService.addFamilyMember(
                                  familyMemberId: selectedFamilyMemberId!,
                                  relationship: selectedRelationship!,
                                  token: widget.token!,
                                );

                                _loadDashboardData();
                                if (mounted) {
                                  ScaffoldMessenger.of(
                                    this.context,
                                  ).showSnackBar(
                                    const SnackBar(
                                      content: Text(
                                        'Family member added successfully!',
                                      ),
                                      backgroundColor: AppTheme.primaryColor,
                                    ),
                                  );
                                }
                              } catch (e) {
                                if (mounted) {
                                  ScaffoldMessenger.of(
                                    this.context,
                                  ).showSnackBar(
                                    SnackBar(
                                      content: Text('Error: $e'),
                                      backgroundColor: AppTheme.accentColor,
                                    ),
                                  );
                                }
                              } finally {
                                searchController.dispose();
                              }
                            },
                    child: const Text('Add'),
                  ),
                ],
              );
            },
          ),
    );
  }

  void _removeFamilyMember(dynamic member) {
    showDialog(
      context: context,
      builder:
          (BuildContext context) => AlertDialog(
            title: const Text('Remove Family Member?'),
            content: Text(
              'Remove ${member['full_name']} from your family members?\n\nThey will no longer have access to your health information.',
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Cancel'),
              ),
              TextButton(
                onPressed: () async {
                  Navigator.pop(context);
                  try {
                    ScaffoldMessenger.of(this.context).showSnackBar(
                      const SnackBar(
                        content: Text('Removing family member...'),
                      ),
                    );

                    await ApiService.removeFamilyMember(
                      familyMemberId: member['user_id'].toString(),
                      token: widget.token!,
                    );
                    _loadDashboardData();
                    if (mounted) {
                      ScaffoldMessenger.of(this.context).showSnackBar(
                        SnackBar(
                          content: Text(
                            '${member['full_name']} removed successfully',
                          ),
                          backgroundColor: AppTheme.primaryColor,
                        ),
                      );
                    }
                  } catch (e) {
                    if (mounted) {
                      ScaffoldMessenger.of(this.context).showSnackBar(
                        SnackBar(
                          content: Text('Error: $e'),
                          backgroundColor: AppTheme.accentColor,
                        ),
                      );
                    }
                  }
                },
                child: const Text(
                  'Remove',
                  style: TextStyle(color: AppTheme.accentColor),
                ),
              ),
            ],
          ),
    );
  }

  Widget _buildAccountTab() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Account Management',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: AppTheme.textPrimaryColor,
          ),
        ),
        const SizedBox(height: 16),
        // Change Password
        Card(
          child: ListTile(
            leading: const Icon(Icons.lock, color: AppTheme.primaryColor),
            title: const Text('Change Password'),
            subtitle: const Text('Update your password'),
            trailing: const Icon(Icons.arrow_forward_ios, size: 16),
            onTap: () => _showChangePasswordDialog(),
          ),
        ),
        const SizedBox(height: 12),
        // Edit Profile
        Card(
          child: ListTile(
            leading: const Icon(Icons.edit, color: AppTheme.primaryColor),
            title: const Text('Edit Profile'),
            subtitle: const Text('Update your personal information'),
            trailing: const Icon(Icons.arrow_forward_ios, size: 16),
            onTap: () => _showEditProfileDialog(),
          ),
        ),
        const SizedBox(height: 12),
        // Logout
        Card(
          child: ListTile(
            leading: const Icon(Icons.logout, color: AppTheme.accentColor),
            title: const Text('Logout'),
            subtitle: const Text('Sign out from your account'),
            trailing: const Icon(Icons.arrow_forward_ios, size: 16),
            onTap: _logout,
          ),
        ),
      ],
    );
  }

  void _showChangePasswordDialog() {
    final oldPasswordController = TextEditingController();
    final newPasswordController = TextEditingController();
    final confirmPasswordController = TextEditingController();
    bool showOldPassword = false;
    bool showNewPassword = false;

    showDialog(
      context: context,
      builder:
          (BuildContext context) => StatefulBuilder(
            builder:
                (context, setState) => AlertDialog(
                  title: const Text('Change Password'),
                  content: SingleChildScrollView(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        TextField(
                          controller: oldPasswordController,
                          obscureText: !showOldPassword,
                          decoration: InputDecoration(
                            labelText: 'Current Password',
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                            suffixIcon: IconButton(
                              icon: Icon(
                                showOldPassword
                                    ? Icons.visibility
                                    : Icons.visibility_off,
                              ),
                              onPressed:
                                  () => setState(
                                    () => showOldPassword = !showOldPassword,
                                  ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),
                        TextField(
                          controller: newPasswordController,
                          obscureText: !showNewPassword,
                          decoration: InputDecoration(
                            labelText: 'New Password',
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                            suffixIcon: IconButton(
                              icon: Icon(
                                showNewPassword
                                    ? Icons.visibility
                                    : Icons.visibility_off,
                              ),
                              onPressed:
                                  () => setState(
                                    () => showNewPassword = !showNewPassword,
                                  ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),
                        TextField(
                          controller: confirmPasswordController,
                          obscureText: !showNewPassword,
                          decoration: InputDecoration(
                            labelText: 'Confirm Password',
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.pop(context),
                      child: const Text('Cancel'),
                    ),
                    TextButton(
                      onPressed: () async {
                        if (newPasswordController.text !=
                            confirmPasswordController.text) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Passwords do not match'),
                              backgroundColor: AppTheme.accentColor,
                            ),
                          );
                          return;
                        }

                        try {
                          await ApiService.updatePassword(
                            userId: widget.userId!,
                            oldPassword: oldPasswordController.text,
                            newPassword: newPasswordController.text,
                            token: widget.token!,
                          );
                          Navigator.pop(context);
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Password updated successfully'),
                              backgroundColor: AppTheme.primaryColor,
                            ),
                          );
                        } catch (e) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('Error: $e'),
                              backgroundColor: AppTheme.accentColor,
                            ),
                          );
                        }
                      },
                      child: const Text('Update'),
                    ),
                  ],
                ),
          ),
    );
  }

  void _showEditProfileDialog() {
    final nameController = TextEditingController(
      text: _patientData?['full_name'],
    );
    final phoneController = TextEditingController(
      text: _patientData?['phone_number'],
    );
    final conditionController = TextEditingController(
      text: _patientData?['medical_condition'],
    );

    showDialog(
      context: context,
      builder:
          (BuildContext context) => AlertDialog(
            title: const Text('Edit Profile'),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextField(
                    controller: nameController,
                    decoration: InputDecoration(
                      labelText: 'Full Name',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: phoneController,
                    decoration: InputDecoration(
                      labelText: 'Phone Number',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: conditionController,
                    decoration: InputDecoration(
                      labelText: 'Medical Condition',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Cancel'),
              ),
              TextButton(
                onPressed: () async {
                  try {
                    await ApiService.updateProfile(
                      userId: widget.userId!,
                      fullName: nameController.text,
                      phoneNumber: phoneController.text,
                      medicalCondition: conditionController.text,
                      token: widget.token!,
                    );
                    Navigator.pop(context);
                    _loadDashboardData();
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Profile updated successfully'),
                        backgroundColor: AppTheme.primaryColor,
                      ),
                    );
                  } catch (e) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('Error: $e'),
                        backgroundColor: AppTheme.accentColor,
                      ),
                    );
                  }
                },
                child: const Text('Update'),
              ),
            ],
          ),
    );
  }
}
