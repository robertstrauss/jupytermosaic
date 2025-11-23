__import__("setuptools").setup()

setup(
    name="mosaic-lab",
    version="0.1.0",
    packages=find_packages(),
    include_package_data=True,
    zip_safe=False,
    install_requires=[
        "jupyterlab>=4.0.0"
    ]
)
